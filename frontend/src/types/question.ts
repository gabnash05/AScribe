export interface Question {
    questionId: string;
    documentId: string;
    tags?: string[];
    question: string;
    choices?: string[];
    answer: string;
    createdAt: string;
}