import { z } from 'zod';

// Document types
export const documentTypeSchema = z.enum([
  'ID',
  'NIE_TIE',
  'BANK_STATEMENT',
  'EMPLOYMENT_CONTRACT',
  'PAYSLIP',
  'TAX_RETURN',
  'OTHER',
]);

// Allowed MIME types
export const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

// Max file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Upload document schema
export const uploadDocumentSchema = z.object({
  type: documentTypeSchema,
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z
    .string()
    .refine(
      (type) => allowedMimeTypes.includes(type),
      'Invalid file type. Only PDF, JPG, and PNG files are allowed'
    ),
  fileSize: z
    .number()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE, 'File size must not exceed 10MB'),
  file: z.any(), // File buffer or data
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
