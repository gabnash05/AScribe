import { APIGatewayProxyHandler } from 'aws-lambda';
import * as dynamoDBService from '../../services/dynamoDBService';
import * as s3Service from '../../services/s3Service';

const DOCUMENTS_BUCKET = process.env.DOCUMENT_BUCKET!;
const DOCUMENTS_TABLE_NAME = process.env.DOCUMENTS_TABLE!;
const EXTRACTED_TEXTS_TABLE_NAME = process.env.EXTRACTED_TEXTS_TABLE!;
const QUESTIONS_TABLE_NAME = process.env.QUESTIONS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const { userId, documentId } = event.pathParameters || {};

        if (!userId || !documentId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'Missing userId or documentId' }),
            };
        }

        const document = await dynamoDBService.getDocumentFromDynamoDB({
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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ error: 'Document not found' }),
            };
        }

        // 1. Delete file from S3
        await s3Service.deleteDocumentFromS3({
            bucket: DOCUMENTS_BUCKET,
            key: document.fileKey,
        });

        // 2. Delete extracted text record (if present)
        if (document.extractedTextId) {
            await dynamoDBService.deleteExtractedTextFromDynamoDB({
                tableName: EXTRACTED_TEXTS_TABLE_NAME,
                extractedTextId: document.extractedTextId,
                documentId,
            });
        }

        // 3. Delete all related questions
        await dynamoDBService.deleteQuestionsByDocumentIdFromDynamoDB({
            tableName: QUESTIONS_TABLE_NAME,
            documentId,
        });

        // 4. Delete document record
        await dynamoDBService.deleteDocumentFromDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
            documentId,
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Document, extracted text, and related questions deleted successfully.',
            }),
        };

    } catch (error: any) {
        console.error('Delete document error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                stack: error.stack,
            }),
        };
    }
};
