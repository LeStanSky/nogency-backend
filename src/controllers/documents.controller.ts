import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentsService } from '../services/documents.service.js';
import { uploadDocumentSchema } from '../schemas/document.schema.js';
import { ZodError } from 'zod';

interface SerializedBuffer {
  type: 'Buffer';
  data: number[];
}

interface DocumentUploadBody {
  file?: Buffer | SerializedBuffer;
  fileName?: string;
  mimeType?: string;
  type?: string;
}

export class DocumentsController {
  /**
   * Upload a new document
   * POST /api/v1/documents
   */
  static async uploadDocument(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const body = request.body as DocumentUploadBody;

      // Convert serialized Buffer to actual Buffer if needed
      let fileBuffer: Buffer;
      if (Buffer.isBuffer(body.file)) {
        fileBuffer = body.file;
      } else if (
        body.file &&
        'type' in body.file &&
        body.file.type === 'Buffer' &&
        'data' in body.file &&
        Array.isArray(body.file.data)
      ) {
        // Handle serialized Buffer object from tests
        fileBuffer = Buffer.from(body.file.data);
      } else if (body.file) {
        // Try to convert to Buffer
        fileBuffer = Buffer.from(body.file);
      } else {
        return reply.code(400).send({
          error: 'File is required',
        });
      }

      // Calculate file size from buffer
      const fileSize = fileBuffer.length;

      // Validate input
      const validatedData = uploadDocumentSchema.parse({
        ...body,
        file: fileBuffer,
        fileSize,
      });

      const document = await DocumentsService.uploadDocument(userId, validatedData);

      reply.code(201).send(document);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }

      const message = error instanceof Error ? error.message : 'Failed to upload document';
      reply.code(500).send({ error: message });
    }
  }

  /**
   * Get all documents for current user
   * GET /api/v1/documents
   */
  static async getUserDocuments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const documents = await DocumentsService.getUserDocuments(userId);

      reply.code(200).send(documents);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch documents';
      reply.code(500).send({ error: message });
    }
  }

  /**
   * Get a single document by ID
   * GET /api/v1/documents/:id
   */
  static async getDocumentById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params;

      const document = await DocumentsService.getDocumentById(userId, id);

      reply.code(200).send(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document';

      if (message === 'Document not found') {
        return reply.code(404).send({ error: message });
      }

      if (message.includes('Forbidden')) {
        return reply.code(403).send({ error: message });
      }

      reply.code(500).send({ error: message });
    }
  }

  /**
   * Delete a document
   * DELETE /api/v1/documents/:id
   */
  static async deleteDocument(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params;

      await DocumentsService.deleteDocument(userId, id);

      reply.code(200).send({
        message: 'Document deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';

      if (message === 'Document not found') {
        return reply.code(404).send({ error: message });
      }

      if (message.includes('Forbidden')) {
        return reply.code(403).send({ error: message });
      }

      reply.code(500).send({ error: message });
    }
  }

  /**
   * Verify a document using AI
   * POST /api/v1/documents/:id/verify
   */
  static async verifyDocument(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params;

      const document = await DocumentsService.verifyDocument(userId, id);

      reply.code(200).send(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify document';

      if (message === 'Document not found') {
        return reply.code(404).send({ error: message });
      }

      if (message.includes('Forbidden')) {
        return reply.code(403).send({ error: message });
      }

      if (message.includes('already verified')) {
        return reply.code(400).send({ error: message });
      }

      reply.code(500).send({ error: message });
    }
  }
}
