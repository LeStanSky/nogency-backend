import { z } from 'zod';

// ============================================================================
// Owner Profile Schemas
// ============================================================================

export const createOwnerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  documentType: z.enum(['DNI', 'NIE', 'TIE', 'PASSPORT']),
  documentNumber: z.string().min(1, 'Document number is required'),
  isCompany: z.boolean().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  bankAccountIban: z.string().optional(),
});

export const updateOwnerProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  documentType: z.enum(['DNI', 'NIE', 'TIE', 'PASSPORT']).optional(),
  documentNumber: z.string().min(1).optional(),
  isCompany: z.boolean().optional(),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  bankAccountIban: z.string().optional(),
});

// ============================================================================
// Tenant Profile Schemas
// ============================================================================

export const createTenantProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  documentType: z.enum(['DNI', 'NIE', 'TIE', 'PASSPORT']),
  documentNumber: z.string().min(1, 'Document number is required'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  occupation: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'OTHER']).optional(),
  employerName: z.string().optional(),
  monthlyIncome: z.number().positive().optional(),
  hasPets: z.boolean().optional(),
  petsDescription: z.string().optional(),
  numberOfOccupants: z.number().int().positive().optional(),
  hasChildren: z.boolean().optional(),
  childrenAges: z.array(z.number().int().positive()).optional(),
  preferredMoveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  rentalDurationMonths: z.number().int().positive().optional(),
  applicationSource: z.enum(['APP', 'WHATSAPP', 'EMAIL']).optional(),
});

export const updateTenantProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  documentType: z.enum(['DNI', 'NIE', 'TIE', 'PASSPORT']).optional(),
  documentNumber: z.string().min(1).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  occupation: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'RETIRED', 'OTHER']).optional(),
  employerName: z.string().optional(),
  monthlyIncome: z.number().positive().optional(),
  hasPets: z.boolean().optional(),
  petsDescription: z.string().optional(),
  numberOfOccupants: z.number().int().positive().optional(),
  hasChildren: z.boolean().optional(),
  childrenAges: z.array(z.number().int().positive()).optional(),
  preferredMoveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  rentalDurationMonths: z.number().int().positive().optional(),
  applicationSource: z.enum(['APP', 'WHATSAPP', 'EMAIL']).optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type CreateOwnerProfileInput = z.infer<typeof createOwnerProfileSchema>;
export type UpdateOwnerProfileInput = z.infer<typeof updateOwnerProfileSchema>;
export type CreateTenantProfileInput = z.infer<typeof createTenantProfileSchema>;
export type UpdateTenantProfileInput = z.infer<typeof updateTenantProfileSchema>;
