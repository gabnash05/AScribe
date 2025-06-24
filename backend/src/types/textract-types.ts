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

export interface TextractGetResult {
    success: boolean;
    message?: string;
    lines: string[];
    status: string;
}