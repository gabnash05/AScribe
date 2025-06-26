export interface IndexDocumentParams {
    id: string;
    body: Record<string, any>;
}

export interface DeleteDocumentParams {
    id: string;
}

export interface SearchDocumentsParams {
    query: string;
    userId: string;
    from?: number;
    size?: number;
}

export interface SearchDocumentsResult {
    total: number;
    hits: Array<{
        id: string;
        [key: string]: any;
    }>;
}
