import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import { RegisterInput } from '../schemas/auth.schema.js';
import { EmailService } from './email.service.js';

export class AuthService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
  private static readonly PASSWORD_RESET_EXPIRY_HOURS = 1;

  /**
   * Generate a secure random token
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Generate email verification token
    const emailVerificationToken = this.generateSecureToken();
    const emailVerificationExpires = new Date(
      Date.now() + this.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    // Create user with role
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        preferredLanguage: data.preferredLanguage,
        emailVerificationToken,
        emailVerificationExpires,
        roles: {
          create: {
            role: data.role,
          },
        },
      },
      include: {
        roles: true,
      },
    });

    // Send verification email (fire and forget - don't block registration)
    EmailService.sendVerificationEmail(user.email, emailVerificationToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Login existing user
   */
  static async login(email: string, password: string) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        preferredLanguage: user.preferredLanguage,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        ownerProfile: true,
        tenantProfile: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
      roles: user.roles.map((r) => r.role),
      ownerProfile: user.ownerProfile,
      tenantProfile: user.tenantProfile,
    };
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send welcome email
    EmailService.sendWelcomeEmail(user.email).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return { message: 'Email successfully verified' };
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists or not for security
    if (!user) {
      return { message: 'If the email exists, a verification link has been sent' };
    }

    if (user.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = this.generateSecureToken();
    const emailVerificationExpires = new Date(
      Date.now() + this.EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Send verification email
    EmailService.sendVerificationEmail(email, emailVerificationToken).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    return { message: 'If the email exists, a verification link has been sent' };
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if email exists or not for security
    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate password reset token
    const passwordResetToken = this.generateSecureToken();
    const passwordResetExpires = new Date(
      Date.now() + this.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    // Send password reset email
    EmailService.sendPasswordResetEmail(email, passwordResetToken).catch((err) => {
      console.error('Failed to send password reset email:', err);
    });

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password successfully reset' };
  }
}
