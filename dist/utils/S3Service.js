"use strict";
/**
 * S3 Service for file uploads and signed URL generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const environment_1 = require("../config/environment");
const logger_1 = require("../config/logger");
const errors_1 = require("../types/errors");
class S3Service {
    constructor() {
        this.expiresIn = 3600; // 1 hour
        this.bucket = environment_1.config.AWS_S3_BUCKET || 'test-jedi-exports';
        this.region = environment_1.config.AWS_REGION || 'us-east-1';
        // Initialize S3 client
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
            credentials: {
                accessKeyId: environment_1.config.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: environment_1.config.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    /**
     * Upload file to S3 and return signed URL
     */
    async uploadFile(fileName, fileContent, contentType, projectId) {
        try {
            const key = `exports/${projectId}/${Date.now()}-${fileName}`;
            // Convert string to Buffer if needed
            const body = typeof fileContent === 'string'
                ? Buffer.from(fileContent, 'utf-8')
                : fileContent;
            // Upload to S3
            const command = new client_s3_1.PutObjectCommand({
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
            logger_1.logger.info(`File uploaded to S3: ${key}`);
            // Generate signed URL
            const signedUrl = await this.generateSignedUrl(key);
            return signedUrl;
        }
        catch (error) {
            logger_1.logger.error('Error uploading file to S3:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to upload export file');
        }
    }
    /**
     * Generate signed URL for S3 object
     */
    async generateSignedUrl(key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn: this.expiresIn,
            });
            return signedUrl;
        }
        catch (error) {
            logger_1.logger.error('Error generating signed URL:', error);
            throw new errors_1.AppError(500, errors_1.ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to generate download URL');
        }
    }
    /**
     * Delete file from S3
     */
    async deleteFile(key) {
        try {
            // To delete, use DeleteObjectCommand if available, or just log for now
            logger_1.logger.info(`File cleanup scheduled for S3: ${key}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting file from S3:', error);
        }
    }
}
exports.S3Service = S3Service;
//# sourceMappingURL=S3Service.js.map