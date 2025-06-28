// PARAMS
export interface UploadFileParams {
    bucket: string;
    fileBuffer: Buffer;
    contentType: string;
    userId: string;
    originalFileName: string;
}

export interface MoveTempToFinalPathParams {
    bucket: string; 
    userId: string; 
    documentId: string;
    tempKey: string;
}

export interface UploadExtractedTextParams {
    bucket: string;
    documentId: string;
    userId: string;
    extractedText: string;
}

export interface getDocumentFromS3Params {
    bucket: string;
    key: string;
}

export interface deleteDocumentFromS3Params {
    bucket: string;
    key: string;
}

export interface GetS3ObjectMetadataParams {
    bucket: string;
    key: string;
}

export interface PresignedUploadParams {
    bucket: string;
    userId: string;
    originalFileName: string;
    contentType: string;
    expiresIn?: number; // Optional, default is 3600 seconds (1 hour)
}

export interface PresignedGetUrlParams {
    bucket: string;
    key: string;
    expiresIn?: number;
}

// RESULTS  
export interface S3UploadResult {
    key: string;
    url?: string;
}

export interface GetS3ObjectMetadataResult {
    userId: string;
    documentId: string;
    contentType: string;
    fileSize: number;
}

export interface PresignedUploadResult {
    key: string;
    url: string;
}

export interface PresignedGetUrlResult {
    url: string;
}