// PARAMS
export interface CleanExtractedTextWithBedrockParams {
    modelId: string;
    extractedText: string;
    currentFilePaths: string[];
    averageConfidence: number;
}

export interface GenerateSummaryParams {
    modelId: string;
    cleanedText: string;
}

export interface GenerateQuestionParams {
    modelId: string;
    cleanedText: string;
    questionCount: number;
}

// RESULTS
export interface CleanExtractedTextWithBedrockResult {
    cleanedText: string;
    tags: string[];
    suggestedFilePath: string
}

export interface GenerateSummaryResult {
    summary: string;
}

export interface GenerateQuestionResult {
    questions: QuestionItem[];
}

export interface QuestionItem {
    question: string;
    answer: string;
    choices: string[];
    tags: string[];
}