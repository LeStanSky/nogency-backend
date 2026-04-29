import { z } from 'zod';

// ============================================================================
// Listing Status Enum
// ============================================================================

export const listingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'RENTED', 'ARCHIVED']);

// ============================================================================
// Create Listing Schema
// ============================================================================

export const createListingSchema = z.object({
  propertyId: z.string().uuid('Property ID must be a valid UUID'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  monthlyRent: z.number().positive('Monthly rent must be positive'),
  depositAmount: z.number().nonnegative('Deposit amount must be non-negative'),
  utilitiesIncluded: z.boolean().optional(),
  minLeaseTermMonths: z.number().int().positive('Minimum lease term must be positive'),
  maxLeaseTermMonths: z.number().int().positive().optional(),
  availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  preferredTenantCriteria: z
    .object({
      minIncome: z.number().optional(),
      employmentStatus: z.array(z.string()).optional(),
      allowPets: z.boolean().optional(),
      allowSmoking: z.boolean().optional(),
      maxOccupants: z.number().int().optional(),
    })
    .optional(),
  channels: z.array(z.string()).optional(),
});

// ============================================================================
// Update Listing Schema
// ============================================================================

export const updateListingSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  monthlyRent: z.number().positive().optional(),
  depositAmount: z.number().nonnegative().optional(),
  utilitiesIncluded: z.boolean().optional(),
  minLeaseTermMonths: z.number().int().positive().optional(),
  maxLeaseTermMonths: z.number().int().positive().optional(),
  availableFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  preferredTenantCriteria: z
    .object({
      minIncome: z.number().optional(),
      employmentStatus: z.array(z.string()).optional(),
      allowPets: z.boolean().optional(),
      allowSmoking: z.boolean().optional(),
      maxOccupants: z.number().int().optional(),
    })
    .optional(),
  channels: z.array(z.string()).optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type ListingStatus = z.infer<typeof listingStatusEnum>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
