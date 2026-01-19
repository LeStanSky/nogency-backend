import { Resend } from 'resend';
import { config } from '../config.js';

// Initialize Resend client (only if API key is provided)
const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Service for sending transactional emails via Resend
 */
export class EmailService {
  /**
   * Send an email using Resend
   */
  static async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    // In test environment or if no API key, simulate success
    if (config.env === 'test' || !resend) {
      console.log(`📧 [Mock] Email sent to ${options.to}: ${options.subject}`);
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: `${config.email.fromName} <${config.email.fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Email send error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<EmailResult> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoGency AI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
    <p>Hello${userName ? ` ${userName}` : ''},</p>
    <p>Thank you for registering with NoGency AI! Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email</a>
    </div>
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${verificationUrl}</p>
    <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin-bottom: 0;">If you didn't create an account with NoGency AI, you can safely ignore this email.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Verify Your Email Address

Hello${userName ? ` ${userName}` : ''},

Thank you for registering with NoGency AI! Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with NoGency AI, you can safely ignore this email.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - NoGency AI',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string,
    userName?: string
  ): Promise<EmailResult> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoGency AI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    <p>Hello${userName ? ` ${userName}` : ''},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">${resetUrl}</p>
    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Reset Your Password

Hello${userName ? ` ${userName}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - NoGency AI',
      html,
      text,
    });
  }

  /**
   * Send welcome email after verification
   */
  static async sendWelcomeEmail(email: string, userName?: string): Promise<EmailResult> {
    const loginUrl = `${config.frontendUrl}/login`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NoGency AI</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoGency AI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Welcome to NoGency AI! 🎉</h2>
    <p>Hello${userName ? ` ${userName}` : ''},</p>
    <p>Your email has been verified and your account is now active. Welcome to the future of rental property management!</p>
    <p>With NoGency AI, you can:</p>
    <ul style="color: #555;">
      <li>🏠 List and manage your rental properties</li>
      <li>📋 Receive and review tenant applications</li>
      <li>🤖 Get AI-powered tenant screening and scoring</li>
      <li>📄 Create and sign digital contracts</li>
      <li>💳 Process secure payments</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Get Started</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin-bottom: 0;">Need help? Contact our support team at support@nogency.com</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Welcome to NoGency AI! 🎉

Hello${userName ? ` ${userName}` : ''},

Your email has been verified and your account is now active. Welcome to the future of rental property management!

With NoGency AI, you can:
- List and manage your rental properties
- Receive and review tenant applications
- Get AI-powered tenant screening and scoring
- Create and sign digital contracts
- Process secure payments

Get started: ${loginUrl}

Need help? Contact our support team at support@nogency.com
    `.trim();

    return this.sendEmail({
      to: email,
      subject: 'Welcome to NoGency AI! 🎉',
      html,
      text,
    });
  }

  /**
   * Send application received notification to owner
   */
  static async sendApplicationReceivedEmail(
    ownerEmail: string,
    ownerName: string,
    tenantName: string,
    listingTitle: string,
    applicationId: string
  ): Promise<EmailResult> {
    const applicationUrl = `${config.frontendUrl}/applications/${applicationId}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Application Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoGency AI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">New Application Received! 📬</h2>
    <p>Hello ${ownerName},</p>
    <p>Great news! You have received a new application for your listing:</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Listing:</strong> ${listingTitle}</p>
      <p style="margin: 0;"><strong>Applicant:</strong> ${tenantName}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${applicationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Review Application</a>
    </div>
    <p style="color: #666; font-size: 14px;">Use our AI-powered scoring to quickly evaluate the applicant's profile and make informed decisions.</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin-bottom: 0;">You're receiving this because you have an active listing on NoGency AI.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
New Application Received! 📬

Hello ${ownerName},

Great news! You have received a new application for your listing:

Listing: ${listingTitle}
Applicant: ${tenantName}

Review the application: ${applicationUrl}

Use our AI-powered scoring to quickly evaluate the applicant's profile and make informed decisions.

You're receiving this because you have an active listing on NoGency AI.
    `.trim();

    return this.sendEmail({
      to: ownerEmail,
      subject: `New Application for "${listingTitle}" - NoGency AI`,
      html,
      text,
    });
  }

  /**
   * Send application status update to tenant
   */
  static async sendApplicationStatusEmail(
    tenantEmail: string,
    tenantName: string,
    listingTitle: string,
    status: 'APPROVED' | 'REJECTED' | 'REVIEWING',
    rejectionReason?: string
  ): Promise<EmailResult> {
    const statusMessages = {
      APPROVED: {
        title: 'Application Approved! 🎉',
        message:
          'Congratulations! Your application has been approved. The property owner will contact you soon with next steps.',
        color: '#10B981',
      },
      REJECTED: {
        title: 'Application Update',
        message: `Unfortunately, your application was not selected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} Don't worry - there are plenty of other great properties available!`,
        color: '#EF4444',
      },
      REVIEWING: {
        title: 'Application Under Review 👀',
        message:
          'Great news! The property owner is now reviewing your application. We will notify you once a decision has been made.',
        color: '#F59E0B',
      },
    };

    const statusInfo = statusMessages[status];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoGency AI</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: ${statusInfo.color}; margin-top: 0;">${statusInfo.title}</h2>
    <p>Hello ${tenantName},</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Listing:</strong> ${listingTitle}</p>
    </div>
    <p>${statusInfo.message}</p>
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin-bottom: 0;">You're receiving this because you applied to a listing on NoGency AI.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
${statusInfo.title}

Hello ${tenantName},

Listing: ${listingTitle}

${statusInfo.message}

You're receiving this because you applied to a listing on NoGency AI.
    `.trim();

    return this.sendEmail({
      to: tenantEmail,
      subject: `${statusInfo.title} - ${listingTitle}`,
      html,
      text,
    });
  }
}
