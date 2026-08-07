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

export function resetPasswordEmailTemplate(name: string, otp: string): string {
  return `
    <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">InteriorOS</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
        <h2 style="font-size: 20px; font-weight: 600; color: #0f172a; margin: 0 0 16px;">Reset your password</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
          Hi ${name}, we received a request to reset your password. Use the following OTP to set a new password.
        </p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 6px;">${otp}</span>
        </div>
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

export function quotationInvoiceEmailTemplate(
  customerName: string,
  quotation: {
    version: number;
    quotationNumber?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    taxPercentage: number;
    tax: number;
    discount: number;
    grandTotal: number;
    notes?: string;
    createdAt?: Date | string;
  },
  companyName: string = 'InteriorOS'
): string {
  const formattedItems = (quotation.items || []).map((item, idx) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px; font-size: 13px; color: #334155; text-align: center;">${idx + 1}</td>
      <td style="padding: 12px; font-size: 13px; color: #0f172a; font-weight: 500;">${item.description}</td>
      <td style="padding: 12px; font-size: 13px; color: #334155; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; font-size: 13px; color: #334155; text-align: right;">₹${(item.unitPrice || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 12px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right;">₹${((item.total || (item.quantity * item.unitPrice)) || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const qtnNum = quotation.quotationNumber || `QTN-V${quotation.version}`;
  const dateStr = new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; background-color: #f8fafc;">
      <!-- Main Container Card -->
      <div style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; color: #ffffff;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${companyName}</h1>
                <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Proforma Invoice & Quotation</p>
              </td>
              <td align="right" valign="top">
                <span style="display: inline-block; background-color: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; color: #38bdf8;">
                  ${qtnNum}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Details Section -->
        <div style="padding: 24px 32px 16px; background-color: #ffffff;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td valign="top" width="50%">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Billed To</p>
                <p style="margin: 4px 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${customerName}</p>
              </td>
              <td valign="top" width="50%" align="right">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Quotation Date</p>
                <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #334155;">${dateStr}</p>
              </td>
            </tr>
          </table>
        </div>

        <!-- Line Items Table -->
        <div style="padding: 0 32px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-radius: 8px;">
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: center; border-top-left-radius: 8px;">#</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: left;">Item Description</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: center;">Qty</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: right;">Unit Price</th>
                <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; text-align: right; border-top-right-radius: 8px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${formattedItems}
            </tbody>
          </table>
        </div>

        <!-- Summary Totals -->
        <div style="padding: 20px 32px 28px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td width="50%" valign="top">
                ${quotation.notes ? `
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-right: 16px;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Terms & Notes</p>
                    <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">${quotation.notes}</p>
                  </div>
                ` : ''}
              </td>
              <td width="50%" valign="top" align="right">
                <table border="0" cellspacing="0" cellpadding="4" style="min-width: 220px;">
                  <tr>
                    <td style="font-size: 13px; color: #64748b;">Subtotal:</td>
                    <td align="right" style="font-size: 13px; font-weight: 600; color: #334155;">₹${(quotation.subtotal || 0).toLocaleString('en-IN')}</td>
                  </tr>
                  ${quotation.taxPercentage ? `
                    <tr>
                      <td style="font-size: 13px; color: #64748b;">GST (${quotation.taxPercentage}%):</td>
                      <td align="right" style="font-size: 13px; font-weight: 600; color: #334155;">₹${(quotation.tax || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  ${quotation.discount ? `
                    <tr>
                      <td style="font-size: 13px; color: #059669;">Discount:</td>
                      <td align="right" style="font-size: 13px; font-weight: 600; color: #059669;">-₹${(quotation.discount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #e2e8f0;">
                    <td style="padding-top: 8px; font-size: 15px; font-weight: 800; color: #0f172a;">Grand Total:</td>
                    <td align="right" style="padding-top: 8px; font-size: 16px; font-weight: 800; color: #2563eb;">₹${(quotation.grandTotal || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            Thank you for considering <strong>${companyName}</strong> for your interior fit-out needs!
          </p>
        </div>

      </div>
    </div>
  `;
}

