// PARAMS
export interface StartDocumentTextDetectionParams {
    bucket: string; 
    key: string;
    userId: string;
    documentId: string;
    snsTopicArn: string;
    roleArn: string;
}

// RESULT
export interface startDocumentTextDetectionParams {
    success: boolean;
    message?: string;
    jobId: string;
}
export interface TextractGetResult {
    success: boolean;
    message?: string;
    lines: string[];
    status: string;
}