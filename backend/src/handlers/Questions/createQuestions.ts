import { APIGatewayProxyHandler } from "aws-lambda";
import {
    getDocumentFromDynamoDB,
    getExtractedTextInDynamoDB,
    saveQuestionToDynamoDB
} from '../../services/dynamoDBService';
import { generateQuestion } from '../../services/bedrockService';
import { getDocumentFromS3 } from '../../services/s3Service';

const DOCUMENTS_TABLE_NAME = process.env.DOCUMENTS_TABLE!;
const EXTRACTED_TEXTS_TABLE_NAME = process.env.EXTRACTED_TEXTS_TABLE!;
const QUESTIONS_TABLE_NAME = process.env.QUESTIONS_TABLE!;
const DOCUMENT_BUCKET = process.env.DOCUMENT_BUCKET!;
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID!;

interface CreateQuestionsRequest {
    numQuestions: number;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const { userId, documentId } = event.pathParameters || {};

        let requestBody: CreateQuestionsRequest;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (error) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Invalid JSON in request body',
                }),
            };
        }

        const { numQuestions } = requestBody;

        // Input validation
        if (!userId || !documentId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Missing userId or documentId',
                }),
            };
        }

        if (!numQuestions || typeof numQuestions !== 'number' || numQuestions < 1 || numQuestions > 10) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Invalid number of questions requested (must be between 1 and 10)',
                }),
            };
        }

        // Verify document exists and is in correct state
        const document = await getDocumentFromDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
            documentId,
        });

        if (!document) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Document not found',
                }),
            };
        }

        if (document.status !== 'cleaned' && document.status !== 'verified') {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Document text must be cleaned before generating questions',
                }),
            };
        }

        // Get extracted text metadata
        const extractedText = await getExtractedTextInDynamoDB({
            tableName: EXTRACTED_TEXTS_TABLE_NAME,
            extractedTextId: document.extractedTextId,
            documentId,
        });

        if (!extractedText) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Extracted text metadata not found',
                }),
            };
        }

        // Fetch the actual extracted text content from S3
        const textContentBuffer = await getDocumentFromS3({
            bucket: DOCUMENT_BUCKET,
            key: extractedText.textFileKey
        });
        const cleanedText = textContentBuffer.toString('utf-8');

        if (!cleanedText || cleanedText.trim().length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Extracted text content is empty',
                }),
            };
        }

        // Generate questions using Bedrock service
        const { questions: generatedQuestions } = await generateQuestion({
            modelId: BEDROCK_MODEL_ID,
            cleanedText,
            questionCount: numQuestions
        });

        // Save questions to DynamoDB
        const createdAt = new Date().toISOString();
        const savePromises = generatedQuestions.map((q, index) => {
            const questionId = `q_${Date.now()}_${index}`;
            return saveQuestionToDynamoDB({
                tableName: QUESTIONS_TABLE_NAME,
                question: {
                    questionId: questionId,
                    documentId,
                    tags: q.tags || [],
                    question: q.question,
                    choices: q.choices || [],
                    answer: q.answer,
                    createdAt,
                }
            });
        });

        await Promise.all(savePromises);

        return {
            statusCode: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Questions generated and saved successfully',
                count: generatedQuestions.length,
                documentId,
            }),
        };

    } catch (error: any) {
        console.error("Lambda error:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                stack: process.env.STAGE === 'dev' ? error.stack : undefined
            }),
        };
    }
};