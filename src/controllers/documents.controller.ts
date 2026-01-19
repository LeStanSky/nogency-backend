import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentsService } from '../services/documents.service.js';
import { uploadDocumentSchema } from '../schemas/document.schema.js';
import { ZodError } from 'zod';
import {
  ForbiddenError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../utils/errors.js';

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
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
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
    } else {
      throw new BadRequestError('File is required');
    }

    // Calculate file size from buffer
    const fileSize = fileBuffer.length;

    // Validate input
    let validatedData;
    try {
      validatedData = uploadDocumentSchema.parse({
        ...body,
        file: fileBuffer,
        fileSize,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', {
          fields: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        });
      }
      throw error;
    }

    const document = await DocumentsService.uploadDocument(userId, validatedData);

    reply.code(201).send(document);
  }

  /**
   * Get all documents for current user
   * GET /api/v1/documents
   */
  static async getUserDocuments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const documents = await DocumentsService.getUserDocuments(userId);

    reply.code(200).send(documents);
  }

  /**
   * Get a single document by ID
   * GET /api/v1/documents/:id
   */
  static async getDocumentById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const { id } = request.params;

    try {
      const document = await DocumentsService.getDocumentById(userId, id);
      reply.code(200).send(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch document';

      if (message === 'Document not found') {
        throw new NotFoundError(message);
      }

      if (message.includes('Forbidden')) {
        throw new ForbiddenError(message);
      }

      throw error;
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
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const { id } = request.params;

    try {
      await DocumentsService.deleteDocument(userId, id);

      reply.code(200).send({
        message: 'Document deleted successfully',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';

      if (message === 'Document not found') {
        throw new NotFoundError(message);
      }

      if (message.includes('Forbidden')) {
        throw new ForbiddenError(message);
      }

      throw error;
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
    const userId = request.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const { id } = request.params;

    try {
      const document = await DocumentsService.verifyDocument(userId, id);
      reply.code(200).send(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to verify document';

      if (message === 'Document not found') {
        throw new NotFoundError(message);
      }

      if (message.includes('Forbidden')) {
        throw new ForbiddenError(message);
      }

      if (message.includes('already verified')) {
        throw new BadRequestError(message);
      }

      throw error;
    }
  }
}
