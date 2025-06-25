// PARAMS
export interface CleanExtractedTextWithBedrockParams {
    modelId: string;
    extractedText: string;
    currentFilePaths: string[];
    averageConfidence: number;
}

export interface CleanExtractedTextWithBedrockResult {
    cleanedText: string;
    tags: string[];
    filePath: string
}