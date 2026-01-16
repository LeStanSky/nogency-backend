import { prisma } from '../db/client.js';
import { StorageService } from './storage.service.js';
import { AIService } from './ai.service.js';
import { UploadDocumentInput } from '../schemas/document.schema.js';
import { Prisma, Document } from '@prisma/client';

export class DocumentsService {
  /**
   * Upload a document and create database record
   */
  static async uploadDocument(userId: string, data: UploadDocumentInput): Promise<Document> {
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
  static async getUserDocuments(userId: string): Promise<Document[]> {
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
  static async getDocumentById(userId: string, documentId: string): Promise<Document> {
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

  /**
   * Verify a document using AI
   */
  static async verifyDocument(userId: string, documentId: string): Promise<Document> {
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

      // Check if already verified
      if (document.status === 'VERIFIED') {
        throw new Error('Document is already verified');
      }

      // Call AI service to verify document
      const verificationData = await AIService.verifyDocument(document.fileUrl, document.type);

      // Update document with verification data
      const updatedDocument = await prisma.document.update({
        where: {
          id: documentId,
        },
        data: {
          status: 'VERIFIED',
          verificationData: verificationData as Prisma.InputJsonValue,
          verifiedAt: new Date(),
        },
      });

      return updatedDocument;
    } catch (error) {
      throw error;
    }
  }
}
