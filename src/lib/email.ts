// =============================================================================
// InteriorOS Backend — Email Service (Nodemailer)
// =============================================================================

import nodemailer from 'nodemailer';
import { env } from '@/config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${env.APP_NAME}" <${env.EMAIL_FROM}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // Don't throw — email failures shouldn't break the app flow
  }
}

// ── Email Templates ──────────────────────────────────────────────────────────

export function verificationEmailTemplate(name: string, verificationUrl: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">InteriorOS</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px;">Verify your email</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, welcome to InteriorOS! Please verify your email address to get started.
        </p>
        <a href="${verificationUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Verify Email Address
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0; line-height: 1.5;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export function resetPasswordEmailTemplate(name: string, resetUrl: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">InteriorOS</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px;">Reset your password</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, we received a request to reset your password. Click the button below to set a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Reset Password
        </a>
        <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0; line-height: 1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export function welcomeEmailTemplate(name: string, loginUrl: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">InteriorOS</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px;">Welcome to InteriorOS!</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, your account has been verified successfully. You're all set to start managing your interior fit-out projects.
        </p>
        <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Go to Dashboard
        </a>
      </div>
    </div>
  `;
}

export function otpEmailTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">InteriorOS</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px;">Verify your email address</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, please use the following one-time password (OTP) to complete your signup process.
        </p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px;">${otp}</span>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
          This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}
