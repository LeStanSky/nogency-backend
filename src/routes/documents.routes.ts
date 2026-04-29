import { FastifyInstance } from 'fastify';
import { DocumentsController } from '../controllers/documents.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { errorResponseSchema } from '../schemas/error.schema.js';

export default async function documentsRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('onRequest', authMiddleware);

  // Upload document
  app.post('/', {
    schema: {
      description:
        'Upload a document (ID, payslip, bank statement, etc.). ' +
        'Send as multipart/form-data with fields: file (binary), type (string), name (string optional)',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      // Note: body validation for multipart is handled by the controller, not JSON Schema
      response: {
        201: {
          description: 'Document uploaded successfully',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              userId: '550e8400-e29b-41d4-a716-446655440000',
              type: 'DNI',
              name: 'DNI_front.jpg',
              originalName: 'DNI_front.jpg',
              mimeType: 'image/jpeg',
              size: 524288,
              status: 'PENDING',
              url: 'https://supabase.storage/documents/user123/DNI_front.jpg',
              createdAt: '2026-01-18T12:00:00.000Z',
            },
          ],
        },
        400: {
          description: 'Invalid file or missing required fields',
          ...errorResponseSchema,
          examples: [
            {
              error: 'File is required',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
      },
    },
    handler: DocumentsController.uploadDocument,
  });

  // Get all user documents
  app.get('/', {
    schema: {
      description: 'Get all documents for the current user',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'List of user documents',
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          examples: [
            [
              {
                id: '550e8400-e29b-41d4-a716-446655440010',
                type: 'DNI',
                name: 'DNI_front.jpg',
                status: 'VERIFIED',
                createdAt: '2026-01-18T12:00:00.000Z',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440011',
                type: 'PAYSLIP',
                name: 'January_2026_payslip.pdf',
                status: 'PENDING',
                createdAt: '2026-01-18T12:30:00.000Z',
              },
            ],
          ],
        },
      },
    },
    handler: DocumentsController.getUserDocuments,
  });

  // Get document by ID
  app.get('/:id', {
    schema: {
      description: 'Get a document by ID',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Document ID' },
        },
      },
      response: {
        200: {
          description: 'Document details',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              userId: '550e8400-e29b-41d4-a716-446655440000',
              type: 'DNI',
              name: 'DNI_front.jpg',
              originalName: 'DNI_front.jpg',
              mimeType: 'image/jpeg',
              size: 524288,
              status: 'VERIFIED',
              url: 'https://supabase.storage/documents/user123/DNI_front.jpg',
              verificationData: {
                fullName: 'Juan Garcia Martinez',
                documentNumber: '12345678A',
                dateOfBirth: '1990-05-15',
                expirationDate: '2030-05-15',
                nationality: 'Spanish',
              },
              createdAt: '2026-01-18T12:00:00.000Z',
              verifiedAt: '2026-01-18T12:05:00.000Z',
            },
          ],
        },
        404: {
          description: 'Document not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Document not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: DocumentsController.getDocumentById,
  });

  // Verify document with AI
  app.post('/:id/verify', {
    schema: {
      description:
        'Verify a document using Claude AI Vision. ' +
        'Extracts data from ID documents (DNI/NIE/TIE), payslips, and bank statements.',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Document ID' },
        },
      },
      response: {
        200: {
          description: 'Verification result with extracted data',
          type: 'object',
          additionalProperties: true,
          examples: [
            {
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'VERIFIED',
              verificationData: {
                fullName: 'Juan Garcia Martinez',
                documentNumber: '12345678A',
                dateOfBirth: '1990-05-15',
                expirationDate: '2030-05-15',
                nationality: 'Spanish',
              },
              verifiedAt: '2026-01-18T12:05:00.000Z',
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440011',
              status: 'VERIFIED',
              verificationData: {
                employerName: 'Tech Company S.L.',
                grossIncome: 4500,
                netIncome: 3500,
                paymentDate: '2026-01-15',
                employmentType: 'Full-time',
              },
              verifiedAt: '2026-01-18T12:10:00.000Z',
            },
          ],
        },
        400: {
          description: 'Document cannot be verified',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Document already verified',
              statusCode: 400,
              code: 'BAD_REQUEST',
            },
          ],
        },
        404: {
          description: 'Document not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Document not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: DocumentsController.verifyDocument,
  });

  // Delete document
  app.delete('/:id', {
    schema: {
      description: 'Delete a document',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Document ID' },
        },
      },
      response: {
        200: {
          description: 'Document deleted',
          type: 'object',
          additionalProperties: true,
          examples: [{ message: 'Document deleted successfully' }],
        },
        404: {
          description: 'Document not found',
          ...errorResponseSchema,
          examples: [
            {
              error: 'Document not found',
              statusCode: 404,
              code: 'NOT_FOUND',
            },
          ],
        },
      },
    },
    handler: DocumentsController.deleteDocument,
  });
}
