import { APIGatewayProxyHandler } from 'aws-lambda';
import * as s3Service from '../../services/s3Service';
import * as dynamoDBService from '../../services/dynamoDBService';
import { getCurrentTimestamp } from '../../utils/timeUtils';

const DOCUMENTS_BUCKET = process.env.DOCUMENT_BUCKET!;
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE!;
const EXTRACTED_TEXTS_TABLE = process.env.EXTRACTED_TEXTS_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const { userId, documentId, finalizedText, newFilePath, newTags, isUpdated } = JSON.parse(event.body || '{}');

        if (!userId || !documentId || !finalizedText || !newFilePath || !newTags) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ 
                    error: 'Missing required fields' 
                }) 
            };
        }

        const document = await dynamoDBService.getDocumentFromDynamoDB({
            tableName: DOCUMENTS_TABLE,
            userId,
            documentId
        });

        if (!document) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Document not found' }) };
        }

        // Update finalized extracted text to S3
        await s3Service.deleteDocumentFromS3({
            bucket: DOCUMENTS_BUCKET,
            key: document.extractedTextId
        });

        const finalizedTextS3 = await s3Service.uploadExtractedText({
            bucket: DOCUMENTS_BUCKET,
            documentId,
            userId,
            extractedText: finalizedText,
        });

        // Update document status and metadata
        await dynamoDBService.updateDocumentInDynamoDB({
            tableName: DOCUMENTS_TABLE,
            userId,
            documentId,
            document: {
                filePath: newFilePath,
                status: 'verified',
                tags: newTags,
                extractedTextId: finalizedTextS3.key
            }
        });

        // Update verification flag in extracted text
        await dynamoDBService.updateExtractedTextInDynamoDB({
            tableName: EXTRACTED_TEXTS_TABLE,
            extractedTextId: finalizedTextS3.key,
            documentId,
            extractedTextRecord: {
                verified: true,
            },
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: 'Document finalized successfully' 
            }),
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
