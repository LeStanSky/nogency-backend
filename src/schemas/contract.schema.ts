import { z } from 'zod';

export const utilitiesResponsibilityEnum = z.enum(['OWNER', 'TENANT', 'SHARED']);

export const contractStatusEnum = z.enum([
  'DRAFT',
  'PENDING_SIGNATURES',
  'ACTIVE',
  'TERMINATED',
  'EXPIRED',
]);

export const createContractSchema = z
  .object({
    applicationId: z.string().uuid('Invalid application ID'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    monthlyRent: z.number().positive('Monthly rent must be positive'),
    depositAmount: z.number().positive('Deposit amount must be positive'),
    depositMonths: z.number().int().min(1).max(6),
    additionalGuaranteeMonths: z.number().int().min(0).max(12).optional(),
    paymentDueDay: z.number().int().min(1).max(28),
    utilitiesResponsibility: utilitiesResponsibilityEnum,
    sublettingAllowed: z.boolean().optional().default(false),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const updateContractSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().positive().optional(),
  depositAmount: z.number().positive().optional(),
  depositMonths: z.number().int().min(1).max(6).optional(),
  additionalGuaranteeMonths: z.number().int().min(0).max(12).optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
  utilitiesResponsibility: utilitiesResponsibilityEnum.optional(),
  sublettingAllowed: z.boolean().optional(),
});

export const terminateContractSchema = z.object({
  reason: z.string().min(10).max(1000),
  terminationDate: z.coerce.date(),
});

export const contractQuerySchema = z.object({
  status: contractStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type TerminateContractInput = z.infer<typeof terminateContractSchema>;
export type ContractQueryInput = z.infer<typeof contractQuerySchema>;
