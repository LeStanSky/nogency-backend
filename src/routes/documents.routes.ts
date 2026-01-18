import { FastifyInstance } from 'fastify';
import { DocumentsController } from '../controllers/documents.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export default async function documentsRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('onRequest', authMiddleware);

  // Upload document
  app.post('/', {
    schema: {
      description: 'Upload a document (ID, payslip, bank statement, etc.)',
      tags: ['Documents'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
      // Note: body validation for multipart is handled by the controller, not JSON Schema
      response: {
        201: {
          description: 'Document uploaded successfully',
          type: 'object',
          additionalProperties: true,
        },
        400: {
          description: 'Invalid file or missing required fields',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        404: {
          description: 'Document not found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: DocumentsController.getDocumentById,
  });

  // Verify document with AI
  app.post('/:id/verify', {
    schema: {
      description: 'Verify a document using Claude AI Vision',
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
        },
        400: {
          description: 'Document cannot be verified',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Document not found',
          type: 'object',
          properties: { error: { type: 'string' } },
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
        },
        404: {
          description: 'Document not found',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    handler: DocumentsController.deleteDocument,
  });
}
