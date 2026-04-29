import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  type: z.enum(['DEPOSIT', 'ADDITIONAL_GUARANTEE', 'RENT', 'SERVICE_FEE', 'PENALTY'], {
    errorMap: () => ({ message: 'Invalid payment type' }),
  }),
  amount: z.number().positive('Amount must be positive'),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

export const paymentQuerySchema = z.object({
  contractId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  type: z
    .enum(['DEPOSIT', 'ADDITIONAL_GUARANTEE', 'RENT', 'SERVICE_FEE', 'PENALTY', 'REFUND'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
