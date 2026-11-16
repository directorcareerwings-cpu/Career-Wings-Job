import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../lib/response';
import { AppError } from '../lib/errors';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from '../services/auth.service';
import {
  sendWelcomeEmail,
  sendRegistrationConfirmationEmail,
  sendOtpEmail,
  sendPasswordChangedEmail,
} from '../services/email.service';
import { createOtpRecord, verifyOtp } from '../services/otp.service';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation rules
export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('role').isIn(['CANDIDATE', 'EMPLOYER']).withMessage('Role must be CANDIDATE or EMPLOYER'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name required'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, role, firstName, lastName, phone, companyName, designation } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, role },
      });

      if (role === 'CANDIDATE') {
        await tx.candidate.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            phone: phone || null,
          },
        });
      } else if (role === 'EMPLOYER') {
        let company = null;
        if (companyName) {
          const slugify = (await import('slugify')).default;
          const baseSlug = slugify(companyName, { lower: true, strict: true });
          let slug = baseSlug;
          let count = 0;
          while (await tx.company.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${++count}`;
          }
          company = await tx.company.create({
            data: { name: companyName, slug },
          });
        }

        await tx.employer.create({
          data: {
            userId: newUser.id,
            firstName,
            lastName,
            phone: phone || null,
            designation: designation || null,
            companyId: company?.id || null,
          },
        });
      }

      return newUser;
    });

    const accessToken = generateAccessToken(user.id, user.role, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Generate secure 6-digit OTP and send to user
    const otp = await createOtpRecord(user.email, 'REGISTRATION', user.id);
    sendOtpEmail(user.email, firstName, otp, 'REGISTRATION', 10, user.id).catch(console.error);

    sendSuccess(
      res,
      {
        requiresVerification: true,
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName,
      },
      'Account created successfully! A 6-digit verification code has been sent to your email.',
      201
    );
  } catch (error) {
    next(error);
  }
};

export const verifyEmailOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new AppError('Email and 6-digit OTP code are required', 400);
    }

    await verifyOtp(email, otp, 'REGISTRATION');

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        candidate: true,
        employer: { include: { company: true } },
      },
    });

    if (!user) throw new AppError('User account not found', 404);

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, emailVerifiedAt: new Date() },
    });

    const firstName = user.candidate?.firstName || user.employer?.firstName || user.email.split('@')[0];
    const lastName = user.candidate?.lastName || user.employer?.lastName || '';

    // Issue tokens
    const accessToken = generateAccessToken(user.id, user.role, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send Welcome & Confirmation Emails asynchronously
    sendWelcomeEmail(user.email, firstName, user.role, user.id).catch(console.error);
    sendRegistrationConfirmationEmail(user.email, firstName, user.role, user.id).catch(console.error);

    sendSuccess(
      res,
      {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName,
          lastName,
          avatar: user.candidate?.profilePhoto || null,
          profile: user.candidate || user.employer,
        },
      },
      'Email verified successfully! Welcome to Career Wings.'
    );
  } catch (error) {
    next(error);
  }
};

export const resendEmailOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, type = 'REGISTRATION' } = req.body;
    if (!email) throw new AppError('Email address is required', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { candidate: true, employer: true },
    });

    if (!user) {
      // Return success to avoid user enumeration
      sendSuccess(res, null, 'If an account exists, a new verification code has been sent.');
      return;
    }

    if (type === 'REGISTRATION' && user.isVerified) {
      throw new AppError('Your email is already verified. Please proceed to log in.', 400);
    }

    const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
    const otp = await createOtpRecord(normalizedEmail, type as 'REGISTRATION' | 'PASSWORD_RESET', user.id);
    sendOtpEmail(user.email, firstName, otp, type as 'REGISTRATION' | 'PASSWORD_RESET', 10, user.id).catch(console.error);

    sendSuccess(res, null, 'A new verification code has been dispatched to your email.');
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid email or password.', 401);
    if (!user.isActive) throw new AppError('Your account has been suspended. Please contact support.', 403);

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) throw new AppError('Invalid email or password.', 401);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = generateAccessToken(user.id, user.role, user.email);
    const refreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Get profile info
    let profile = null;
    if (user.role === 'CANDIDATE') {
      profile = await prisma.candidate.findUnique({
        where: { userId: user.id },
        select: { id: true, firstName: true, lastName: true, profilePhoto: true, profileCompletion: true },
      });
    } else if (user.role === 'EMPLOYER') {
      profile = await prisma.employer.findUnique({
        where: { userId: user.id },
        select: { id: true, firstName: true, lastName: true, company: { select: { id: true, name: true, logo: true } } },
      });
    }

    sendSuccess(res, {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: (profile as any)?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
        lastName: (profile as any)?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
        avatar: (profile as any)?.profilePhoto || null,
        profile,
      },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) throw new AppError('Refresh token required', 401);

    const { userId } = await verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

    // Revoke old token and issue new ones (token rotation)
    await revokeRefreshToken(token);
    const newAccessToken = generateAccessToken(user.id, user.role, user.email);
    const newRefreshToken = await generateRefreshToken(user.id);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Get profile info so client store stays populated
    let profile = null;
    if (user.role === 'CANDIDATE') {
      profile = await prisma.candidate.findUnique({
        where: { userId: user.id },
        select: { id: true, firstName: true, lastName: true, profilePhoto: true, profileCompletion: true },
      });
    } else if (user.role === 'EMPLOYER') {
      profile = await prisma.employer.findUnique({
        where: { userId: user.id },
        select: { id: true, firstName: true, lastName: true, company: { select: { id: true, name: true, logo: true } } },
      });
    }

    sendSuccess(res, {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: (profile as any)?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
        lastName: (profile as any)?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
        avatar: (profile as any)?.profilePhoto || null,
        profile,
      },
    }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) await revokeRefreshToken(token);

    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, role: true, isVerified: true, createdAt: true, lastLoginAt: true },
    });

    if (!user) throw new AppError('User not found', 404);

    let profile = null;
    if (user.role === 'CANDIDATE') {
      profile = await prisma.candidate.findUnique({
        where: { userId: user.id },
        include: {
          candidateSkills: { include: { skill: true } },
          education: { orderBy: { startYear: 'desc' } },
          experience: { orderBy: { startDate: 'desc' } },
          certifications: true,
          languages: true,
        },
      });
    } else if (user.role === 'EMPLOYER') {
      profile = await prisma.employer.findUnique({
        where: { userId: user.id },
        include: { company: true },
      });
    }

    sendSuccess(
      res,
      {
        ...user,
        firstName: (profile as any)?.firstName || (user.role === 'ADMIN' ? 'Admin' : (user.email.split('@')[0])),
        lastName: (profile as any)?.lastName || (user.role === 'ADMIN' ? 'User' : ''),
        avatar: (profile as any)?.profilePhoto || null,
        isEmployerApproved: user.role === 'EMPLOYER' ? Boolean((profile as any)?.isVerified) : true,
        profile,
      },
      'User retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email address is required', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return generic success to protect against account enumeration
    if (user) {
      const profile =
        (await prisma.candidate.findUnique({
          where: { userId: user.id },
          select: { firstName: true },
        })) ||
        (await prisma.employer.findUnique({
          where: { userId: user.id },
          select: { firstName: true },
        }));

      const firstName = profile?.firstName || 'User';

      // Generate secure 6-digit OTP
      const otp = await createOtpRecord(normalizedEmail, 'PASSWORD_RESET', user.id);
      sendOtpEmail(user.email, firstName, otp, 'PASSWORD_RESET', 10, user.id).catch(console.error);
    }

    sendSuccess(
      res,
      null,
      'If an account with this email exists, a 6-digit password reset code has been sent to your inbox.'
    );
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordResetOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError('Email and 6-digit reset code are required', 400);

    const normalizedEmail = email.toLowerCase().trim();
    await verifyOtp(normalizedEmail, otp, 'PASSWORD_RESET');

    sendSuccess(res, { verified: true }, 'Reset code verified successfully. You may now choose a new password.');
  } catch (error) {
    next(error);
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      throw new AppError('Email, 6-digit reset code, and new password are required', 400);
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new AppError('Password must be at least 8 characters with at least 1 uppercase letter and 1 number.', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP code
    await verifyOtp(normalizedEmail, otp, 'PASSWORD_RESET');

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { candidate: true, employer: true },
    });

    if (!user) throw new AppError('User account not found', 404);

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate all active user sessions / refresh tokens
    await revokeAllUserRefreshTokens(user.id);
    res.clearCookie('refreshToken');

    // Send confirmation email
    const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
    sendPasswordChangedEmail(user.email, firstName, req.ip, user.id).catch(console.error);

    sendSuccess(res, null, 'Your password has been changed successfully. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    const userId = await verifyPasswordResetToken(token);
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidate: true, employer: true },
    });

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.passwordReset.updateMany({ where: { token }, data: { isUsed: true } }),
    ]);

    await revokeAllUserRefreshTokens(userId);
    res.clearCookie('refreshToken');

    if (user) {
      const firstName = user.candidate?.firstName || user.employer?.firstName || 'User';
      sendPasswordChangedEmail(user.email, firstName, req.ip, user.id).catch(console.error);
    }

    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};
