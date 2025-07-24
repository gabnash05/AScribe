import axios from "axios";
import { buildUrl } from "../utils/buildUrl";

export interface Question {
    questionId: string;
    documentId: string;
    tags?: string[];
    question: string;
    choices?: string[];
    answer: string;
    createdAt: string;
}

/**
 * Fetches all questions for a specific document
 * @param userId - The ID of the user who owns the document
 * @param documentId - The ID of the document to fetch questions for
 * @param idToken - The user's authentication token
 * @returns Promise<Question[]> - Array of questions
 */
export async function getDocumentQuestions(
    userId: string,
    documentId: string,
    idToken: string
): Promise<Question[]> {
    const url = buildUrl(`documents/${userId}/${documentId}/questions`);
    
    try {
        const response = await axios.get(url, {
            headers: { 
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
        });

        if (!Array.isArray(response.data)) {
            throw new Error("Invalid response: expected an array of questions");
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const apiError = error.response?.data?.error || error.message;
            throw new Error(`Failed to fetch questions: ${apiError}`);
        }
        throw new Error(
            `Unexpected error during questions fetch: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}

/**
 * Creates new questions for a document using AI generation
 * @param userId - The ID of the user who owns the document
 * @param documentId - The ID of the document to create questions for
 * @param numQuestions - Number of questions to generate (1-10)
 * @param idToken - The user's authentication token
 * @returns Promise<{message: string, count: number, documentId: string}>
 */
export async function createDocumentQuestions(
    userId: string,
    documentId: string,
    numQuestions: number,
    idToken: string
): Promise<{message: string, count: number, documentId: string}> {
    const url = buildUrl(`documents/${userId}/${documentId}/questions`);
    
    try {
        const response = await axios.post(
            url,
            { numQuestions },
            {
                headers: { 
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
            }
        );

        if (!response.data || typeof response.data.count !== 'number') {
            throw new Error("Invalid response format");
        }

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const apiError = error.response?.data?.error || error.message;
            throw new Error(`Failed to create questions: ${apiError}`);
        }
        throw new Error(
            `Unexpected error during question creation: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}