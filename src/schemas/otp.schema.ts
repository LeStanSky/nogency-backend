import { z } from 'zod';
import { Role } from '@prisma/client';

// E.164 phone format: +{country_code}{number}, 7-15 digits total
const phoneRegex = /^\+[1-9]\d{6,14}$/;

// Send OTP Schema
export const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone format. Use E.164 format (e.g., +34612345678)'),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

// Verify OTP Schema
export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone format. Use E.164 format (e.g., +34612345678)'),
  code: z.string().length(6, 'OTP code must be 6 digits'),
  email: z.string().email('Invalid email address').optional(),
  role: z.nativeEnum(Role).default(Role.TENANT),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
