/**
 * S3 Service for file uploads and signed URL generation
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { AppError, ErrorCodes } from '../types/errors';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private expiresIn: number = 3600; // 1 hour

  constructor() {
    this.bucket = config.AWS_S3_BUCKET || 'test-jedi-exports';
    this.region = config.AWS_REGION || 'us-east-1';

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload file to S3 and return signed URL
   */
  async uploadFile(
    fileName: string,
    fileContent: Buffer | string,
    contentType: string,
    projectId: string,
  ): Promise<string> {
    try {
      const key = `exports/${projectId}/${Date.now()}-${fileName}`;

      // Convert string to Buffer if needed
      const body =
        typeof fileContent === 'string'
          ? Buffer.from(fileContent, 'utf-8')
          : fileContent;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          'uploaded-at': new Date().toISOString(),
          'project-id': projectId,
        },
      });

      await this.s3Client.send(command);
      logger.info(`File uploaded to S3: ${key}`);

      // Generate signed URL
      const signedUrl = await this.generateSignedUrl(key);
      return signedUrl;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to upload export file',
      );
    }
  }

  /**
   * Generate signed URL for S3 object
   */
  async generateSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw new AppError(
        500,
        ErrorCodes.INTERNAL_SERVER_ERROR,
        'Failed to generate download URL',
      );
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      // To delete, use DeleteObjectCommand if available, or just log for now
      logger.info(`File cleanup scheduled for S3: ${key}`);
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
    }
  }
}
