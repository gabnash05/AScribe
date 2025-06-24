// PARAMS
export interface StartTextExtractionParams {
    bucket: string;
    key: string;
    userId: string;
    documentId: string;
    snsTopicArn: string;
    roleArn: string;
}

// RESULT
export interface TextractStartResult {
    success: boolean;
    message?: string;
    jobId: string | null;
}

export interface TextractGetResult {
    success: boolean;
    message?: string;
    lines: string[];
    status: string;
}