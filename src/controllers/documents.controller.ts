import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentsService } from '../services/documents.service.js';
import { uploadDocumentSchema } from '../schemas/document.schema.js';

export class DocumentsController {
  /**
   * Upload a new document
   * POST /api/v1/documents
   */
  static async uploadDocument(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.userId!;
      const body = request.body as any;

      // Convert serialized Buffer to actual Buffer if needed
      let fileBuffer: Buffer;
      if (Buffer.isBuffer(body.file)) {
        fileBuffer = body.file;
      } else if (body.file?.type === 'Buffer' && Array.isArray(body.file?.data)) {
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
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors,
        });
      }

      reply.code(500).send({
        error: error.message || 'Failed to upload document',
      });
    }
  }

  /**
   * Get all documents for current user
   * GET /api/v1/documents
   */
  static async getUserDocuments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = request.userId!;

      const documents = await DocumentsService.getUserDocuments(userId);

      reply.code(200).send(documents);
    } catch (error: any) {
      reply.code(500).send({
        error: error.message || 'Failed to fetch documents',
      });
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
      const userId = request.userId!;
      const { id } = request.params;

      const document = await DocumentsService.getDocumentById(userId, id);

      reply.code(200).send(document);
    } catch (error: any) {
      if (error.message === 'Document not found') {
        return reply.code(404).send({ error: error.message });
      }

      if (error.message.includes('Forbidden')) {
        return reply.code(403).send({ error: error.message });
      }

      reply.code(500).send({
        error: error.message || 'Failed to fetch document',
      });
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
      const userId = request.userId!;
      const { id } = request.params;

      await DocumentsService.deleteDocument(userId, id);

      reply.code(200).send({
        message: 'Document deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Document not found') {
        return reply.code(404).send({ error: error.message });
      }

      if (error.message.includes('Forbidden')) {
        return reply.code(403).send({ error: error.message });
      }

      reply.code(500).send({
        error: error.message || 'Failed to delete document',
      });
    }
  }
}
