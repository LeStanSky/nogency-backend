import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { config } from '../config.js';
import { RegisterInput } from '../schemas/auth.schema.js';

export class AuthService {
  private static readonly SALT_ROUNDS = 10;

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
    return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
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

    // Create user with role
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        preferredLanguage: data.preferredLanguage,
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
}
