import { z } from 'zod';
import { Role } from '@prisma/client';

// Register Schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  phone: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.TENANT),
  preferredLanguage: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Response types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    preferredLanguage: string | null;
    createdAt: Date;
  };
  token: string;
}
