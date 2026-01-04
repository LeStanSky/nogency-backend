import { FastifyInstance } from 'fastify';
import { DocumentsController } from '../controllers/documents.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export default async function documentsRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('onRequest', authMiddleware);

  // Upload document
  app.post('/', DocumentsController.uploadDocument);

  // Get all user documents
  app.get('/', DocumentsController.getUserDocuments);

  // Get document by ID
  app.get('/:id', DocumentsController.getDocumentById);

  // Delete document
  app.delete('/:id', DocumentsController.deleteDocument);
}
