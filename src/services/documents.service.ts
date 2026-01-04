import { prisma } from '../db/client.js';
import { StorageService } from './storage.service.js';
import { UploadDocumentInput } from '../schemas/document.schema.js';

export class DocumentsService {
  /**
   * Upload a document and create database record
   */
  static async uploadDocument(userId: string, data: UploadDocumentInput): Promise<any> {
    try {
      // Upload file to storage
      const fileUrl = await StorageService.uploadFile(
        userId,
        data.fileName,
        data.file,
        data.mimeType
      );

      // Create document record in database
      const document = await prisma.document.create({
        data: {
          userId,
          type: data.type,
          fileName: data.fileName,
          fileUrl,
          mimeType: data.mimeType,
          fileSize: data.fileSize,
          status: 'PENDING',
        },
      });

      return document;
    } catch (error) {
      throw new Error(
        `Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId: string): Promise<any[]> {
    try {
      const documents = await prisma.document.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return documents;
    } catch (error) {
      throw new Error(
        `Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single document by ID with ownership check
   */
  static async getDocumentById(userId: string, documentId: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check ownership
      if (document.userId !== userId) {
        throw new Error('Forbidden: You do not own this document');
      }

      return document;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a document with ownership check
   */
  static async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      const document = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check ownership
      if (document.userId !== userId) {
        throw new Error('Forbidden: You do not own this document');
      }

      // Delete from storage
      await StorageService.deleteFile(document.fileUrl);

      // Delete from database
      await prisma.document.delete({
        where: {
          id: documentId,
        },
      });
    } catch (error) {
      throw error;
    }
  }
}
