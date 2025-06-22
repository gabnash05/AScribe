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
    documentId: string;
    document: UpdateDocumentRecord; // Only fields that need to be updated
}

// 
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
    userId: string;
    documentId?: string;
    fileKey?: string;
    originalFilename?: string;
    uploadDate?: string;
    status?: 'temp' | 'verified';
    tags?: string[];
    extractedTextId?: string;
}