import { z } from 'zod';

/**
 * Schema for exchanging public token for access token
 */
export const exchangeTokenSchema = z.object({
  publicToken: z.string().min(1, 'Public token is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  institutionName: z.string().min(1, 'Institution name is required'),
});

/**
 * Schema for Plaid webhook payload
 */
export const plaidWebhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string().optional(),
  error: z
    .object({
      error_type: z.string(),
      error_code: z.string(),
      error_message: z.string(),
    })
    .optional(),
});

/**
 * Response schema for Plaid status
 */
export const plaidStatusResponseSchema = z.object({
  isConnected: z.boolean(),
  institutionName: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  incomeVerified: z.boolean(),
  verifiedMonthlyIncome: z.number().nullable(),
});

/**
 * Response schema for Plaid income data
 */
export const plaidIncomeResponseSchema = z.object({
  isVerified: z.boolean(),
  institutionName: z.string().nullable(),
  verifiedAt: z.date().nullable(),
  monthlyIncome: z.number().nullable(),
  incomeStreams: z
    .array(
      z.object({
        name: z.string().nullable(),
        amount: z.number(),
        frequency: z.string().nullable(),
        confidence: z.number().nullable(),
      })
    )
    .optional(),
  accountBalance: z.number().nullable().optional(),
});

// Type exports
export type ExchangeTokenInput = z.infer<typeof exchangeTokenSchema>;
export type PlaidWebhookPayload = z.infer<typeof plaidWebhookSchema>;
export type PlaidStatusResponse = z.infer<typeof plaidStatusResponseSchema>;
export type PlaidIncomeResponse = z.infer<typeof plaidIncomeResponseSchema>;
