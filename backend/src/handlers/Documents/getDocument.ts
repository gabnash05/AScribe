import { APIGatewayProxyHandler } from "aws-lambda";
import * as dynamoDBService from '../../services/dynamoDBService'

const DOCUMENTS_BUCKET = process.env.DOCUMENT_BUCKET!;
const DOCUMENTS_TABLE_NAME = process.env.DOCUMENTS_TABLE!;
const EXTRACTED_TEXTS_TABLE_NAME = process.env.EXTRACTED_TEXTS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const { userId, documentId } = event.pathParameters || {};

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
            }
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
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    error: 'Document not found' 
                }) 
            };
        }

        if (document.status !== 'cleaned' && document.status !== 'verified') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: document.status })
            };
        }

        const extractedText = await dynamoDBService.getExtractedTextInDynamoDB({
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
                    error: 'Extracted text not found' 
                }) 
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                documentId: document.documentId,
                userId: document.userId,
                fileKey: document.fileKey,
                filePath: document.filePath,
                originalFilename: document.originalFilename,
                uploadDate: document.uploadDate,
                contentType: document.contentType,
                fileSize: document.fileSize,
                textExtractionMethod: document.textExtractionMethod,
                status: document.status,
                tags: document.tags,
                extractedTextId: extractedText.extractedTextId,
                textFileKey: extractedText.textFileKey,
                averageConfidence: extractedText.averageConfidence,
            }),
        }

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
                stack: error.stack
            }),
        };
    }
}