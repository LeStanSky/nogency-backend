import { z } from 'zod';

// ============================================================================
// Application Status Enum
// ============================================================================

export const applicationStatusEnum = z.enum([
  'PENDING',
  'REVIEWING',
  'SHORTLISTED',
  'VIEWING_SCHEDULED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);

// ============================================================================
// Application Source Enum
// ============================================================================

export const applicationSourceEnum = z.enum(['APP', 'WHATSAPP', 'EMAIL']);

// ============================================================================
// Create Application Schema
// ============================================================================

export const createApplicationSchema = z.object({
  listingId: z.string().uuid('Listing ID must be a valid UUID'),
  message: z.string().max(2000, 'Message must be at most 2000 characters').optional(),
  proposedMoveInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  proposedLeaseTermMonths: z
    .number()
    .int('Lease term must be an integer')
    .min(1, 'Lease term must be at least 1 month')
    .max(60, 'Lease term must be at most 60 months')
    .optional(),
  source: applicationSourceEnum.optional().default('APP'),
});

// ============================================================================
// Update Application Status Schema
// ============================================================================

export const updateApplicationStatusSchema = z
  .object({
    status: z.enum(['REVIEWING', 'SHORTLISTED', 'VIEWING_SCHEDULED', 'APPROVED', 'REJECTED']),
    rejectionReason: z
      .string()
      .max(500, 'Rejection reason must be at most 500 characters')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED' && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    { message: 'Rejection reason is required when rejecting an application' }
  );

// ============================================================================
// Application Query Schema
// ============================================================================

export const applicationQuerySchema = z.object({
  status: applicationStatusEnum.optional(),
  listingId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ============================================================================
// Type exports
// ============================================================================

export type ApplicationStatus = z.infer<typeof applicationStatusEnum>;
export type ApplicationSource = z.infer<typeof applicationSourceEnum>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type ApplicationQueryInput = z.infer<typeof applicationQuerySchema>;
