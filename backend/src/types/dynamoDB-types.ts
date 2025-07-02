// ENUMS
export type DocumentStatus = 'temp' | 'processing' | 'cleaned' | 'verified';

// PARAMS
export interface SaveDocumentParams {
    tableName: string;
    document: DocumentRecord;
}

export interface GetDocumentParams {
    tableName: string;
    userId: string;
    documentId: string;
}

export interface GetDocumentsByUserParams {
    tableName: string;
    userId: string;
}

export interface UpdateDocumentParams {
    tableName: string;
    userId: string;
    documentId: string;
    document: UpdateDocumentRecord;
}

export interface UpdateDocumentStatusParams {
    tableName: string;
    userId: string;
    documentId: string;
    status: DocumentStatus
}

export interface DeleteDocumentParams {
    tableName: string;
    userId: string;
    documentId: string;
}

export interface SaveExtractedTextParams {
    tableName: string;
    extractedTextRecord: ExtractedTextRecord;
}

export interface UpdateExtractedTextParams {
    tableName: string;
    extractedTextId: string;
    documentId: string;
    extractedTextRecord: UpdateExtractedTextRecord;
}

export interface DeleteExtractedTextParams {
    tableName: string;
    extractedTextId: string;
    documentId: string;
}

export interface SaveSummaryParams {
    tableName: string;
    summary: SummaryRecord;
}

export interface UpdateSummaryParams {
    tableName: string;
    documentId: string;
    summaryId: string;
    summary: UpdateSummaryRecord;
}

export interface DeleteSummaryParams {
    tableName: string;
    documentId: string;
    summaryId: string;
}

export interface SaveQuestionParams {
    tableName: string;
    question: QuestionRecord;
}

export interface UpdateQuestionParams {
    tableName: string;
    documentId: string;
    questionsId: string;
    question: UpdateQuestionRecord;
}

export interface DeleteQuestionParams {
    tableName: string;
    documentId: string;
    questionsId: string;
}

// RECORDS
export interface DocumentRecord {
    userId: string;
    documentId: string;
    fileKey: string;
    filePath: string; // For FE
    originalFilename: string;
    uploadDate: string; // ISO date string
    contentType: string; // MIME type of the file
    fileSize: number; // Size of the file in bytes
    textExtractionMethod: 'sync' | 'async'; // Method used for text extraction
    status: DocumentStatus;
    tags: string[];
    extractedTextId: string;
    textractJobId?: string;
}

export interface UpdateDocumentRecord { // Only fields that can be updated
    fileKey?: string;
    filePath?: string;
    originalFilename?: string;
    uploadDate?: string;
    contentType?: string;
    fileSize?: number;
    textExtractionMethod?: 'sync' | 'async';
    status?: DocumentStatus;
    tags?: string[];
    extractedTextId?: string;
}

export interface ExtractedTextRecord {
    extractedTextId: string; // Unique ID for the extracted text
    documentId: string; // Foreign key to original document
    userId: string;
    processedDate: string; // ISO date string
    verified: boolean;
    textFileKey: string; // S3 key of saved .md/.txt file
    averageConfidence: number; // Optional confidence score
    summaryId?: string; // Optional foreign key to summary
    questionsId?: string[]; // Optional foreign keys to questions
    tokens?: number; // Optional token count
}

export interface UpdateExtractedTextRecord {
    documentId?: string;
    processedDate?: string; // ISO date string
    verified?: boolean;
    textFileKey?: string; // S3 key of saved .md/.txt file
    averageConfidence?: number;
    summaryId?: string; // Optional foreign key to summary
    questionsId?: string[]; // Optional foreign keys to questions
    tokens?: number; // Optional token count
}

export interface SummaryRecord {
    documentId: string; // Partition key
    summaryId: string; // Sort key, unique ID for the summary
    summaryText: string; // The actual summary text
    createdAt: string; // ISO date string
}

export interface UpdateSummaryRecord {
    summaryText?: string; // The actual summary text (optional)
    createdAt?: string; // ISO date string (optional)
}

export interface QuestionRecord {
    questionsId: string; // Unique ID for the question
    documentId: string; // Foreign key to the document
    tags: string[]; // Optional tags for categorization
    question: string; // The actual question text
    choices: string[]; // Optional choices for multiple choice questions
    answer: string; // The correct answer
    createdAt: string; // ISO date string
}

export interface UpdateQuestionRecord {
    tags?: string[]; // Optional tags for categorization
    question?: string; // The actual question text (optional)
    choices?: string[]; // Optional choices for multiple choice questions (optional)
    answer?: string; // The correct answer (optional)
    createdAt?: string; // ISO date string (optional)
}

// RESULTS
export interface DynamoDBSaveResult {
    success: boolean;
    message?: string;
    item?: DocumentRecord | ExtractedTextRecord | SummaryRecord | QuestionRecord;
}

export interface DynamoDBUpdateResult {
    success: boolean;
    message?: string;
    item?: UpdateDocumentRecord | UpdateExtractedTextRecord | UpdateSummaryRecord | UpdateQuestionRecord | DocumentStatus;
}

export interface DynamoDBDeleteResult {
    success: boolean;
    message?: string;
    item?: DocumentRecord | ExtractedTextRecord | SummaryRecord | QuestionRecord;
}