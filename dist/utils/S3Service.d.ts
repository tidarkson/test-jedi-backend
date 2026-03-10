/**
 * S3 Service for file uploads and signed URL generation
 */
export declare class S3Service {
    private s3Client;
    private bucket;
    private region;
    private expiresIn;
    constructor();
    /**
     * Upload file to S3 and return signed URL
     */
    uploadFile(fileName: string, fileContent: Buffer | string, contentType: string, projectId: string): Promise<string>;
    /**
     * Generate signed URL for S3 object
     */
    generateSignedUrl(key: string): Promise<string>;
    /**
     * Delete file from S3
     */
    deleteFile(key: string): Promise<void>;
}
//# sourceMappingURL=S3Service.d.ts.map