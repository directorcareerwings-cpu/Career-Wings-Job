import nodemailer from 'nodemailer';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  isEnabled: boolean;
}

export interface QueuedEmailPayload {
  userId?: string | null;
  to: string;
  subject: string;
  html: string;
  emailType: string;
  templateName: string;
  metadata?: Record<string, unknown>;
}

let cachedSmtpConfig: SmtpConfig | null = null;
let cachedTransporter: nodemailer.Transporter | null = null;

export const clearEmailConfigCache = (): void => {
  cachedSmtpConfig = null;
  cachedTransporter = null;
};

/**
 * Retrieve SMTP configuration from AdminSetting database table, falling back to process.env
 */
export const getSmtpConfig = async (): Promise<SmtpConfig> => {
  if (cachedSmtpConfig) return cachedSmtpConfig;

  try {
    const settings = await prisma.adminSetting.findMany({
      where: {
        key: {
          in: [
            'SMTP_HOST',
            'SMTP_PORT',
            'SMTP_SECURE',
            'SMTP_USER',
            'SMTP_PASS',
            'SMTP_FROM_EMAIL',
            'SMTP_FROM_NAME',
            'SMTP_REPLY_TO',
            'SMTP_IS_ENABLED',
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    const host = map.get('SMTP_HOST') || process.env.SMTP_HOST || '';
    const port = parseInt(map.get('SMTP_PORT') || process.env.SMTP_PORT || '587', 10);
    const secure = map.get('SMTP_SECURE') === 'true' || process.env.SMTP_SECURE === 'true';
    const user = map.get('SMTP_USER') || process.env.SMTP_USER || '';
    const pass = map.get('SMTP_PASS') || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const fromEmail = map.get('SMTP_FROM_EMAIL') || process.env.SMTP_FROM_EMAIL || 'noreply@careerwings.in';
    const fromName = map.get('SMTP_FROM_NAME') || process.env.SMTP_FROM_NAME || 'Career Wings';
    const replyTo = map.get('SMTP_REPLY_TO') || process.env.SMTP_REPLY_TO || 'support@careerwings.in';
    const isEnabled = map.get('SMTP_IS_ENABLED') !== 'false';

    cachedSmtpConfig = {
      host,
      port,
      secure,
      user,
      pass,
      fromEmail,
      fromName,
      replyTo,
      isEnabled,
    };
    return cachedSmtpConfig;
  } catch (err) {
    console.error('[EMAIL] Failed to read SMTP config from DB, using fallback env:', err);
    return {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@careerwings.in',
      fromName: process.env.SMTP_FROM_NAME || 'Career Wings',
      replyTo: process.env.SMTP_REPLY_TO || 'support@careerwings.in',
      isEnabled: true,
    };
  }
};

/**
 * Get or initialize Nodemailer transporter
 */
export const getTransporter = async (): Promise<nodemailer.Transporter | null> => {
  if (cachedTransporter) return cachedTransporter;

  const config = await getSmtpConfig();

  // If credentials are empty or default placeholder, return null to operate in sandbox log mode
  if (!config.host || !config.user || config.user === 'your-email@gmail.com') {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return cachedTransporter;
};

// ========================================
// RESPONSIVE HTML BASE TEMPLATE
// ========================================

const getBaseTemplate = (title: string, content: string, ctaButton?: { text: string; url: string }): string => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Career Wings</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 24px 12px;
      color: #1E293B;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 25px rgba(10, 37, 64, 0.08);
      border: 1px solid #E2E8F0;
    }
    .header {
      background: #0A2540;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 3px solid #F97316;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
    }
    .header h1 span {
      color: #F97316;
    }
    .header p {
      margin: 6px 0 0 0;
      color: #94A3B8;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .badge-primary { background: #EEF2FF; color: #4338CA; }
    .badge-success { background: #ECFDF5; color: #047857; }
    .badge-warning { background: #FFFBEB; color: #B45309; }
    .badge-danger { background: #FEF2F2; color: #B91C1C; }
    .heading {
      color: #0A2540;
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .text {
      color: #475569;
      font-size: 15px;
      margin: 0 0 16px 0;
    }
    .info-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .otp-box {
      background: #F1F5F9;
      border: 2px dashed #CBD5E1;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0A2540;
      font-family: 'Courier New', Courier, monospace;
      margin: 8px 0;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 20px 0;
    }
    .btn {
      display: inline-block;
      background: #F97316;
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      padding: 14px 34px;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);
      transition: all 0.2s ease;
    }
    .footer {
      background: #F8FAFC;
      padding: 28px 24px;
      text-align: center;
      border-top: 1px solid #E2E8F0;
      color: #64748B;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer a {
      color: #0A2540;
      text-decoration: underline;
      font-weight: 600;
    }
    .footer-divider {
      margin: 12px 0;
      border-top: 1px dashed #CBD5E1;
    }
    .security-note {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 20px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1><span>Career</span> Wings</h1>
      <p>Assam's Premier Job & Recruitment Platform</p>
    </div>
    <div class="content">
      ${content}
      ${
        ctaButton
          ? `
      <div class="btn-container">
        <a href="${ctaButton.url}" class="btn">${ctaButton.text}</a>
      </div>`
          : ''
      }
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 700; color: #0A2540;">Career Wings Official Platform</p>
      <p style="margin: 0 0 8px 0;">Zoo Road Tiniali, Guwahati, Assam 781003, India</p>
      <p style="margin: 0;">
        <a href="${clientUrl}">careerwings.in</a> &bull; 
        <a href="mailto:support@careerwings.in">support@careerwings.in</a> &bull; 
        <a href="tel:+918876211864">+91 88762 11864</a>
      </p>
      <div class="footer-divider"></div>
      <p style="margin: 0; font-size: 11px; color: #94A3B8;">
        This is an automated transactional message. Please do not reply directly to this email.<br>
        &copy; ${new Date().getFullYear()} Career Wings. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
};

// ========================================
// EMAIL QUEUE & WORKER
// ========================================

const emailQueue: QueuedEmailPayload[] = [];
let isWorkerRunning = false;

/**
 * Process queued emails sequentially with retry logic and DB audit logging
 */
const processQueue = async (): Promise<void> => {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    while (emailQueue.length > 0) {
      const payload = emailQueue.shift();
      if (!payload) continue;

      let logRecord;
      try {
        logRecord = await prisma.emailLog.create({
          data: {
            userId: payload.userId || null,
            recipientEmail: payload.to,
            emailType: payload.emailType,
            subject: payload.subject,
            templateName: payload.templateName,
            status: 'QUEUED',
            htmlBody: payload.html,
            metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
            attemptCount: 1,
          },
        });
      } catch (dbErr) {
        console.error('[EMAIL QUEUE] Failed to create EmailLog record:', dbErr);
      }

      await deliverEmail(payload, logRecord?.id);
    }
  } finally {
    isWorkerRunning = false;
  }
};

/**
 * Perform actual SMTP delivery or sandbox delivery
 */
const deliverEmail = async (payload: QueuedEmailPayload, emailLogId?: string): Promise<void> => {
  const config = await getSmtpConfig();

  if (!config.isEnabled) {
    console.log(`[EMAIL DISABLED] Email to ${payload.to} skipped because SMTP is disabled.`);
    if (emailLogId) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: 'SMTP delivery is currently disabled in Admin Settings.',
        },
      }).catch(console.error);
    }
    return;
  }

  const transporter = await getTransporter();

  // If no SMTP credentials, run in verified Development Sandbox Mode
  if (!transporter) {
    const sandboxId = `sandbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`[EMAIL SANDBOX] Delivered to: ${payload.to} | Subject: "${payload.subject}" [ID: ${sandboxId}]`);

    if (emailLogId) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: 'SENT',
          providerMessageId: sandboxId,
          sentAt: new Date(),
        },
      }).catch(console.error);
    }
    return;
  }

  // Real SMTP delivery with 1 retry
  let attempt = 0;
  let lastError: any = null;

  while (attempt < 2) {
    attempt++;
    try {
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: payload.to,
        replyTo: config.replyTo,
        subject: payload.subject,
        html: payload.html,
      });

      console.log(`[EMAIL SENT] Delivered to ${payload.to} [MsgId: ${info.messageId}]`);

      if (emailLogId) {
        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: 'SENT',
            providerMessageId: info.messageId || `smtp-${Date.now()}`,
            sentAt: new Date(),
            attemptCount: attempt,
          },
        }).catch(console.error);
      }
      return;
    } catch (err: any) {
      lastError = err;
      console.error(`[EMAIL ERROR] Attempt ${attempt} failed for ${payload.to}:`, err.message);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // If all attempts fail
  if (emailLogId) {
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: lastError?.message || 'SMTP transmission failed',
        attemptCount: attempt,
      },
    }).catch(console.error);
  }
};

/**
 * Enqueue an email to be sent asynchronously without blocking API responses
 */
export const queueEmail = async (payload: QueuedEmailPayload): Promise<void> => {
  emailQueue.push(payload);
  processQueue().catch((err) => console.error('[EMAIL QUEUE ERROR]', err));
};

/**
 * Admin action: Retry a previously failed email log
 */
export const retryFailedEmail = async (emailLogId: string): Promise<boolean> => {
  const log = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
  if (!log) throw new AppError('Email log record not found', 404);

  const payload: QueuedEmailPayload = {
    userId: log.userId,
    to: log.recipientEmail,
    subject: log.subject,
    html: log.htmlBody || '<p>Retrying email delivery</p>',
    emailType: log.emailType,
    templateName: log.templateName,
  };

  await prisma.emailLog.update({
    where: { id: emailLogId },
    data: {
      status: 'QUEUED',
      attemptCount: { increment: 1 },
      failedAt: null,
      failureReason: null,
    },
  });

  await deliverEmail(payload, emailLogId);
  return true;
};

// ========================================
// TRANSACTIONAL EMAIL METHODS
// ========================================

/**
 * 1. Send OTP Verification Email
 */
export const sendOtpEmail = async (
  to: string,
  name: string,
  otp: string,
  type: 'REGISTRATION' | 'PASSWORD_RESET' = 'REGISTRATION',
  expiryMinutes = 10,
  userId?: string
): Promise<void> => {
  const isReg = type === 'REGISTRATION';
  const title = isReg ? 'Verify Your Career Wings Account' : 'Password Reset Code';
  const badgeClass = isReg ? 'badge-primary' : 'badge-warning';
  const badgeText = isReg ? 'Account Verification' : 'Password Reset Request';

  const html = getBaseTemplate(
    title,
    `
    <span class="badge ${badgeClass}">${badgeText}</span>
    <h2 class="heading">Hello ${name || 'there'},</h2>
    <p class="text">
      ${
        isReg
          ? 'Thank you for registering with Career Wings! To complete your account registration and verify your email address, please use the One-Time Password (OTP) below:'
          : 'We received a request to reset the password for your Career Wings account. Please use the verification code below to proceed:'
      }
    </p>
    <div class="otp-box">
      <div style="font-size: 13px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
        Your 6-Digit Verification Code
      </div>
      <div class="otp-code">${otp}</div>
      <div style="font-size: 12px; color: #EF4444; font-weight: 600;">
        &bull; Valid for ${expiryMinutes} minutes &bull; Single use only &bull;
      </div>
    </div>
    <p class="text">
      For security reasons, never share this code with anyone. Career Wings staff will never ask for your verification code.
    </p>
    <p class="security-note">
      If you did not initiate this request, you can safely disregard this email. Your account remains protected.
    </p>
    `
  );

  await queueEmail({
    userId,
    to,
    subject: isReg ? 'Verify Your Career Wings Account — OTP' : 'Career Wings Password Reset OTP',
    html,
    emailType: isReg ? 'OTP_VERIFICATION' : 'PASSWORD_RESET_OTP',
    templateName: isReg ? 'otp_registration' : 'otp_password_reset',
  });
};

/**
 * 2. Send Welcome Email after successful verification
 */
export const sendWelcomeEmail = async (to: string, name: string, role = 'CANDIDATE', userId?: string): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';
  const isEmployer = role === 'EMPLOYER';

  const html = getBaseTemplate(
    'Welcome to Career Wings',
    `
    <span class="badge badge-success">Account Verified &bull; Active</span>
    <h2 class="heading">Welcome aboard, ${name}! 🎉</h2>
    <p class="text">
      Your email address has been successfully verified, and your Career Wings account is now fully active!
    </p>
    <div class="info-card">
      <h3 style="margin: 0 0 10px 0; color: #0A2540; font-size: 16px;">What's next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
        ${
          isEmployer
            ? `
          <li>Complete your company profile and upload your official corporate logo.</li>
          <li>Post job vacancies with targeted requirements for Northeast India talent.</li>
          <li>Search our candidate resume database and reach out directly to candidates.</li>
        `
            : `
          <li>Build or upload your resume to reach top employers across Guwahati & Assam.</li>
          <li>Set up personalized Job Alerts to get instant notifications for matching roles.</li>
          <li>Apply to verified local and remote jobs with 1-click applications.</li>
        `
        }
      </ul>
    </div>
    `,
    {
      text: isEmployer ? 'Go to Recruiter Dashboard' : 'Explore Jobs Now',
      url: isEmployer ? `${clientUrl}/employer/dashboard` : `${clientUrl}/jobs`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: 'Welcome to Career Wings — Account Successfully Verified',
    html,
    emailType: 'WELCOME',
    templateName: 'welcome_verified',
  });
};

/**
 * 3. Send Registration Confirmation Email
 */
export const sendRegistrationConfirmationEmail = async (
  to: string,
  name: string,
  role: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Registration Confirmed',
    `
    <span class="badge badge-primary">Official Confirmation</span>
    <h2 class="heading">Registration Confirmed</h2>
    <p class="text">Hi ${name}, your Career Wings account registration has been confirmed.</p>
    <div class="info-card">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Account Holder:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Registered Email:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${to}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Account Type:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${role}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Registration Date:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        </tr>
      </table>
    </div>
    `,
    {
      text: 'Login to Career Wings',
      url: `${clientUrl}/login`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: 'Career Wings Registration Confirmed',
    html,
    emailType: 'REGISTRATION_CONFIRMED',
    templateName: 'registration_confirmed',
  });
};

/**
 * 4. Send Password Changed Security Notification
 */
export const sendPasswordChangedEmail = async (to: string, name: string, ipAddress?: string, userId?: string): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Password Changed Successfully',
    `
    <span class="badge badge-warning">Security Alert</span>
    <h2 class="heading">Password Changed Successfully</h2>
    <p class="text">Hi ${name},</p>
    <p class="text">
      The password for your Career Wings account (<strong>${to}</strong>) was successfully updated on 
      <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>${ipAddress ? ` from IP: <code>${ipAddress}</code>` : ''}.
    </p>
    <p class="text">
      All previous active login sessions on other browsers or devices have been automatically invalidated for your security.
    </p>
    <div class="info-card" style="border-left: 4px solid #EF4444;">
      <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: 600;">
        ⚠️ Did you not make this change?
      </p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #7F1D1D;">
        If you did not authorize this change, please contact Career Wings Support immediately at 
        <a href="mailto:support@careerwings.in" style="color: #991B1B; font-weight: 700;">support@careerwings.in</a> 
        or call <a href="tel:+918876211864" style="color: #991B1B; font-weight: 700;">+91 88762 11864</a> to secure your account.
      </p>
    </div>
    `,
    {
      text: 'Log In with New Password',
      url: `${clientUrl}/login`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: 'Your Career Wings Password Was Changed',
    html,
    emailType: 'PASSWORD_CHANGED',
    templateName: 'password_changed',
  });
};

/**
 * 5. Send Package / Subscription Assigned Email
 */
export const sendPackageAssignedEmail = async (
  to: string,
  name: string,
  details: {
    packageName: string;
    packageId?: string;
    durationDays: number;
    amount?: number;
    expiryDate: Date;
    benefits?: string[];
  },
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const formattedExpiry = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(details.expiryDate));

  const html = getBaseTemplate(
    'Package Activated',
    `
    <span class="badge badge-success">Package Active</span>
    <h2 class="heading">Your Package is Live! 🚀</h2>
    <p class="text">Hi ${name},</p>
    <p class="text">
      Your <strong>${details.packageName}</strong> subscription has been successfully activated on Career Wings.
    </p>
    <div class="info-card">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Plan Name:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0A2540; text-align: right;">${details.packageName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Duration:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${details.durationDays} Days</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Amount:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">₹${details.amount ?? 0}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Valid Until:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #16A34A; text-align: right;">${formattedExpiry}</td>
        </tr>
      </table>
    </div>
    <p class="text">
      You can manage your active package, view balance quotas, and check invoices directly from your dashboard.
    </p>
    `,
    {
      text: 'View My Package Dashboard',
      url: `${clientUrl}/subscription`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: 'Your Career Wings Package Has Been Activated',
    html,
    emailType: 'PACKAGE_ASSIGNED',
    templateName: 'package_assigned',
  });
};

/**
 * 6. Send Payment Success Confirmation Email
 */
export const sendPaymentConfirmationEmail = async (
  to: string,
  name: string,
  details: {
    transactionId: string;
    orderId?: string;
    packageName: string;
    amount: number;
    paymentDate?: Date;
    invoiceNumber?: string;
  },
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Payment Successful',
    `
    <span class="badge badge-success">Payment Received</span>
    <h2 class="heading">Thank you for your payment! ✅</h2>
    <p class="text">Hi ${name},</p>
    <p class="text">
      We have received your payment for the <strong>${details.packageName}</strong> subscription on Career Wings.
    </p>
    <div class="info-card">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Transaction ID:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #0A2540; text-align: right;">${details.transactionId}</td>
        </tr>
        ${
          details.orderId
            ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Order ID:</td>
          <td style="padding: 6px 0; font-family: monospace; font-weight: 600; color: #0A2540; text-align: right;">${details.orderId}</td>
        </tr>`
            : ''
        }
        ${
          details.invoiceNumber
            ? `
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Invoice No:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${details.invoiceNumber}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Package:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${details.packageName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Amount Paid:</td>
          <td style="padding: 6px 0; font-weight: 800; font-size: 16px; color: #F97316; text-align: right;">₹${details.amount}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Date & Time:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${(details.paymentDate || new Date()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td>
        </tr>
      </table>
    </div>
    <p class="text">
      Your plan benefits are immediately available on your account.
    </p>
    `,
    {
      text: 'View Payment History',
      url: `${clientUrl}/payments`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `Payment Successful — ₹${details.amount} | Career Wings`,
    html,
    emailType: 'PAYMENT_SUCCESS',
    templateName: 'payment_success',
  });
};

/**
 * 7. Send Payment Failed Email
 */
export const sendPaymentFailedEmail = async (
  to: string,
  name: string,
  details: {
    packageName: string;
    amount: number;
    reason?: string;
  },
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Payment Failed',
    `
    <span class="badge badge-danger">Payment Incomplete</span>
    <h2 class="heading">Payment Could Not Be Processed</h2>
    <p class="text">Hi ${name},</p>
    <p class="text">
      Your payment attempt for <strong>${details.packageName}</strong> (₹${details.amount}) could not be completed.
    </p>
    ${
      details.reason
        ? `
    <div class="info-card" style="border-left: 4px solid #EF4444;">
      <strong style="color: #991B1B; font-size: 13px;">Reason for Failure:</strong>
      <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">${details.reason}</p>
    </div>`
        : ''
    }
    <p class="text">
      No charges were deducted from your account. If amount was debited by your bank, it will be automatically refunded within 3-5 business days.
    </p>
    `,
    {
      text: 'Retry Payment',
      url: `${clientUrl}/pricing`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: 'Career Wings Payment Failed',
    html,
    emailType: 'PAYMENT_FAILED',
    templateName: 'payment_failed',
  });
};

/**
 * 8. Send Job Approved Email to Employer
 */
export const sendJobApprovedEmail = async (
  to: string,
  employerName: string,
  jobTitle: string,
  companyName: string,
  slug: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Job Posting Approved',
    `
    <span class="badge badge-success">Moderation Approved</span>
    <h2 class="heading">Your Job is Now Live! 🎉</h2>
    <p class="text">Hi ${employerName},</p>
    <p class="text">
      Great news! Your job posting for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been reviewed and approved by the Career Wings moderation team.
    </p>
    <p class="text">
      The vacancy is now publicly visible to job seekers across Guwahati, Assam, and Northeast India.
    </p>
    `,
    {
      text: 'View Live Job Vacancy',
      url: `${clientUrl}/jobs/${slug}`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `Your Job Posting Has Been Approved — ${jobTitle}`,
    html,
    emailType: 'JOB_APPROVED',
    templateName: 'job_approved',
  });
};

/**
 * 9. Send Job Rejected Email to Employer
 */
export const sendJobRejectedEmail = async (
  to: string,
  employerName: string,
  jobTitle: string,
  companyName: string,
  reason?: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Job Posting Update',
    `
    <span class="badge badge-danger">Revision Required</span>
    <h2 class="heading">Job Posting Status Update</h2>
    <p class="text">Hi ${employerName},</p>
    <p class="text">
      Thank you for posting <strong>${jobTitle}</strong> on Career Wings. Upon review, our moderation team was unable to approve the posting in its current form.
    </p>
    <div class="info-card" style="border-left: 4px solid #EF4444;">
      <strong style="color: #991B1B; font-size: 13px;">Moderator Feedback:</strong>
      <p style="margin: 4px 0 0 0; color: #475569; font-size: 14px;">${reason || 'The posting requires additional details to meet quality and safety standards.'}</p>
    </div>
    <p class="text">
      You can edit the vacancy details and resubmit for approval at any time.
    </p>
    `,
    {
      text: 'Edit Job Vacancy',
      url: `${clientUrl}/employer/jobs`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `Job Posting Update: ${jobTitle} — Career Wings`,
    html,
    emailType: 'JOB_REJECTED',
    templateName: 'job_rejected',
  });
};

/**
 * 10. Send New Application Received Email to Employer
 */
export const sendNewApplicationEmployerEmail = async (
  to: string,
  employerName: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  jobId: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'New Job Application',
    `
    <span class="badge badge-primary">New Applicant</span>
    <h2 class="heading">New Application Received 📩</h2>
    <p class="text">Hi ${employerName},</p>
    <p class="text">
      <strong>${candidateName}</strong> just applied for your vacancy: <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.
    </p>
    <div class="info-card">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Applicant:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0A2540; text-align: right;">${candidateName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Role Applied:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${jobTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Applied At:</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0A2540; text-align: right;">${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
        </tr>
      </table>
    </div>
    <p class="text">
      Review their credentials, resume, and experience directly from your recruiter console.
    </p>
    `,
    {
      text: 'Review Candidate Profile',
      url: `${clientUrl}/employer/jobs/${jobId}/applicants`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `New Application for ${jobTitle} — ${candidateName}`,
    html,
    emailType: 'NEW_APPLICATION_EMPLOYER',
    templateName: 'new_application_employer',
  });
};

/**
 * 11. Send Application Received Email to Candidate
 */
export const sendApplicationReceivedEmail = async (
  to: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const html = getBaseTemplate(
    'Application Submitted',
    `
    <span class="badge badge-success">Application Sent</span>
    <h2 class="heading">Application Submitted! ✅</h2>
    <p class="text">Hi ${candidateName},</p>
    <p class="text">
      Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully transmitted to the hiring team.
    </p>
    <div class="info-card">
      <p style="margin: 0; color: #0A2540; font-weight: 600; font-size: 14px;">
        Track updates, interview requests, and shortlisted status anytime from your Candidate Applications portal.
      </p>
    </div>
    `,
    {
      text: 'View My Applications',
      url: `${clientUrl}/my-applications`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `Application Submitted: ${jobTitle} at ${companyName}`,
    html,
    emailType: 'APPLICATION_STATUS',
    templateName: 'application_submitted_candidate',
  });
};

/**
 * 12. Send Application Status Update Email to Candidate
 */
export const sendApplicationStatusEmail = async (
  to: string,
  candidateName: string,
  jobTitle: string,
  status: string,
  employerMessage?: string,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const statusMap: Record<string, { badge: string; badgeClass: string; title: string; desc: string }> = {
    VIEWED: {
      badge: 'Application Viewed',
      badgeClass: 'badge-primary',
      title: 'Your Application was Reviewed',
      desc: `The recruiter has viewed your application for ${jobTitle}.`,
    },
    SHORTLISTED: {
      badge: 'Shortlisted 🎉',
      badgeClass: 'badge-success',
      title: 'Congratulations! You Have Been Shortlisted',
      desc: `You have been shortlisted by the employer for ${jobTitle}!`,
    },
    INTERVIEW: {
      badge: 'Interview Invitation 📅',
      badgeClass: 'badge-primary',
      title: 'Interview Scheduled',
      desc: `The hiring team has invited you for an interview for ${jobTitle}.`,
    },
    SELECTED: {
      badge: 'Selected 🏆',
      badgeClass: 'badge-success',
      title: 'Congratulations! You are Selected',
      desc: `You have been selected for the position of ${jobTitle}!`,
    },
    REJECTED: {
      badge: 'Application Update',
      badgeClass: 'badge-danger',
      title: 'Application Update',
      desc: `Thank you for your interest in ${jobTitle}. The company has decided to proceed with other candidates at this time.`,
    },
  };

  const info = statusMap[status] || {
    badge: 'Status Update',
    badgeClass: 'badge-primary',
    title: 'Application Status Updated',
    desc: `Your application for ${jobTitle} has been updated to: ${status}.`,
  };

  const html = getBaseTemplate(
    info.title,
    `
    <span class="badge ${info.badgeClass}">${info.badge}</span>
    <h2 class="heading">${info.title}</h2>
    <p class="text">Hi ${candidateName},</p>
    <p class="text">${info.desc}</p>
    ${
      employerMessage
        ? `
    <div class="info-card">
      <strong style="color: #0A2540; font-size: 13px;">Message from Hiring Manager:</strong>
      <p style="margin: 6px 0 0 0; color: #475569; font-size: 14px; font-style: italic;">"${employerMessage}"</p>
    </div>`
        : ''
    }
    `,
    {
      text: 'View Application Details',
      url: `${clientUrl}/my-applications`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `${info.badge}: ${jobTitle} — Career Wings`,
    html,
    emailType: 'APPLICATION_STATUS',
    templateName: 'application_status_update',
  });
};

/**
 * 13. Send Package Expiry Reminder Email
 */
export const sendPackageExpiryEmail = async (
  to: string,
  name: string,
  packageName: string,
  daysLeft: number,
  expiryDate: Date,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const formattedExpiry = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(expiryDate));

  const isTomorrow = daysLeft <= 1;

  const html = getBaseTemplate(
    'Package Expiry Reminder',
    `
    <span class="badge badge-warning">Subscription Reminder</span>
    <h2 class="heading">Your ${packageName} plan expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h2>
    <p class="text">Hi ${name},</p>
    <p class="text">
      Your <strong>${packageName}</strong> package will expire on <strong>${formattedExpiry}</strong> (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining).
    </p>
    <p class="text">
      Renew now to ensure uninterrupted access to your active job listings, candidate database search, and recruiter quotas.
    </p>
    `,
    {
      text: 'Renew Package Now',
      url: `${clientUrl}/pricing`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: isTomorrow
      ? `Final Reminder: Your Career Wings Package Expires Tomorrow`
      : `Your ${packageName} Package Expires in ${daysLeft} Days`,
    html,
    emailType: 'PACKAGE_EXPIRY_REMINDER',
    templateName: 'package_expiry_reminder',
  });
};

/**
 * 14. Send Job Alert Digest Email
 */
export const sendJobAlertEmail = async (
  to: string,
  name: string,
  jobs: Array<{ title: string; company: string; location: string; slug: string }>,
  userId?: string
): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';

  const jobCardsHtml = jobs
    .map(
      (job) => `
    <div style="border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 12px; background: #FFFFFF;">
      <h3 style="margin: 0 0 6px 0; color: #0A2540; font-size: 16px; font-weight: 700;">${job.title}</h3>
      <p style="margin: 0 0 10px 0; color: #64748B; font-size: 13px;">${job.company} &bull; ${job.location}</p>
      <a href="${clientUrl}/jobs/${job.slug}" style="color: #F97316; font-size: 13px; font-weight: 700; text-decoration: none;">
        View Job Details &rarr;
      </a>
    </div>`
    )
    .join('');

  const html = getBaseTemplate(
    'New Jobs Matching Your Alert',
    `
    <span class="badge badge-primary">Daily Job Alert</span>
    <h2 class="heading">New Matches Found for You 🔔</h2>
    <p class="text">Hi ${name}, here are ${jobs.length} new openings in Assam & Northeast India matching your preferences:</p>
    ${jobCardsHtml}
    `,
    {
      text: 'Browse All Vacancies',
      url: `${clientUrl}/jobs`,
    }
  );

  await queueEmail({
    userId,
    to,
    subject: `${jobs.length} New Job Openings Match Your Alerts — Career Wings`,
    html,
    emailType: 'JOB_ALERT',
    templateName: 'job_alert_digest',
  });
};

/**
 * 15. Send Admin System Notification
 */
export const sendAdminNotification = async (eventType: string, title: string, message: string): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'https://careerwings.in';
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@careerwings.in';

  const html = getBaseTemplate(
    `Admin Alert: ${eventType}`,
    `
    <span class="badge badge-warning">System Alert</span>
    <h2 class="heading">${title}</h2>
    <div class="info-card">
      <p style="margin: 0; color: #0A2540; font-size: 14px;">${message}</p>
    </div>
    `,
    {
      text: 'Open Admin Console',
      url: `${clientUrl}/admin/dashboard`,
    }
  );

  await queueEmail({
    to: adminEmail,
    subject: `Career Wings Admin Alert — ${eventType}`,
    html,
    emailType: 'ADMIN_ALERT',
    templateName: 'admin_system_alert',
  });
};

/**
 * 16. Send Test Email for Admin Configuration Verification
 */
export const sendTestEmail = async (toEmail: string): Promise<{ success: boolean; message: string }> => {
  const html = getBaseTemplate(
    'Test Email Delivery',
    `
    <span class="badge badge-success">Diagnostics Test</span>
    <h2 class="heading">SMTP Connectivity Test Successful! 🚀</h2>
    <p class="text">
      This is a verified test transmission from the <strong>Career Wings Email Subsystem</strong>.
    </p>
    <div class="info-card">
      <p style="margin: 0; font-size: 13px; color: #0A2540;">
        <strong>Verified At:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br>
        <strong>Recipient:</strong> ${toEmail}<br>
        <strong>Engine:</strong> Career Wings Production SMTP Worker
      </p>
    </div>
    `
  );

  await queueEmail({
    to: toEmail,
    subject: 'Career Wings SMTP Test Email — Configuration Verified',
    html,
    emailType: 'TEST_EMAIL',
    templateName: 'smtp_test_mail',
  });

  return { success: true, message: `Test email has been queued for ${toEmail}. Check Email Logs for delivery status.` };
};
