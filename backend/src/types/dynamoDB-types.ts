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

export interface UpdateDocumentParams {
    tableName: string;
    userId: string;
    documentId: string;
    document: UpdateDocumentRecord;
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
    originalFilename: string;
    uploadDate: string; // ISO date string
    status: 'temp' | 'verified';
    tags: string[];
    extractedTextId: string;
}

export interface UpdateDocumentRecord { // Only fields that can be updated
    fileKey?: string;
    originalFilename?: string;
    uploadDate?: string;
    status?: 'temp' | 'verified';
    tags?: string[];
    extractedTextId?: string;
}

export interface ExtractedTextRecord {
    extractedTextId: string; // Unique ID for the extracted text
    documentId: string; // Foreign key to original document
    processedDate: string; // ISO date string
    verified: boolean;
    textFileKey: string; // S3 key of saved .md/.txt file
    summaryId?: string; // Optional foreign key to summary
    questionsId?: string[]; // Optional foreign keys to questions
    tokens?: number; // Optional token count
}

export interface UpdateExtractedTextRecord {
    processedDate?: string; // ISO date string
    verified?: boolean;
    textFileKey?: string; // S3 key of saved .md/.txt file
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
    item?: UpdateDocumentRecord | UpdateExtractedTextRecord | UpdateSummaryRecord | UpdateQuestionRecord;
}

export interface DynamoDBDeleteResult {
    success: boolean;
    message?: string;
    item?: DocumentRecord | ExtractedTextRecord | SummaryRecord | QuestionRecord;
}