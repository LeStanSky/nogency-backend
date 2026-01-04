import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../db/client.js';

export class StorageService {
  private static readonly BUCKET_NAME = 'documents';

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    userId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    try {
      // Generate unique file path
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${userId}/${randomUUID()}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(fileUrl);

      if (!filePath) {
        // If path extraction fails, don't throw error (file might not exist)
        return;
      }

      const { error } = await supabaseAdmin.storage.from(this.BUCKET_NAME).remove([filePath]);

      if (error) {
        // Log error but don't throw - file might already be deleted
        console.warn(`Storage delete warning: ${error.message}`);
      }
    } catch (error) {
      // Log error but don't throw - allow deletion to continue
      console.warn(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(filePath: string): string {
    const { data } = supabaseAdmin.storage.from(this.BUCKET_NAME).getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Extract file path from storage URL
   */
  private static extractFilePathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${this.BUCKET_NAME}/`);
      return pathParts[1] || '';
    } catch {
      // Fallback for non-URL format
      const parts = url.split('/storage/');
      return parts[1] || '';
    }
  }
}
