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