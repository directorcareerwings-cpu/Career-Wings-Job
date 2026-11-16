import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmailOtp,
  resendEmailOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
  registerValidation,
  loginValidation,
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { body } from 'express-validator';

const router = Router();

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.post('/refresh', refreshToken);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

// OTP Verification & Resend
router.post(
  '/verify-otp',
  [body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 }).isNumeric()],
  validate([body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })]),
  verifyEmailOtp
);
router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validate([body('email').isEmail()]),
  resendEmailOtp
);

// Password Reset via OTP
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate([body('email').isEmail()]),
  forgotPassword
);
router.post(
  '/verify-reset-otp',
  [body('email').isEmail().normalizeEmail(), body('otp').isLength({ min: 6, max: 6 }).isNumeric()],
  validate([body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 })]),
  verifyPasswordResetOtp
);
router.post(
  '/reset-password-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  ],
  validate([body('email').isEmail(), body('otp').isLength({ min: 6, max: 6 }), body('password').isLength({ min: 8 })]),
  resetPasswordWithOtp
);

// Legacy token-based reset password
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  ],
  validate([body('token').notEmpty(), body('password').isLength({ min: 8 })]),
  resetPassword
);

export default router;
