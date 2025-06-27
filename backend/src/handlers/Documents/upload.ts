import { APIGatewayProxyHandler } from 'aws-lambda';
import { TextractResult } from '../../services/textractService';
import * as s3Service from '../../services/s3Service';
import * as textractService from '../../services/textractService';
import * as bedrockService from '../../services/bedrockService';

const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET || '';
const EXTRACTED_TEXTS_BUCKET = process.env.EXTRACTED_TEXTS_BUCKET || '';
const TEXTRACT_SNS_TOPIC_ARN = process.env.TEXTRACT_SNS_TOPIC_ARN || '';
const TEXTRACT_ROLE_ARN = process.env.TEXTRACT_ROLE_ARN || '';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || '';

const SYNC_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SYNC_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ProcessDocumentResult {
    documentId: string;
    userId: string;
    textExtractionMethod: 'sync' | 'async';
    textractJobId?: string;
    originalFileName: string;
    cleanedText?: string;
    tags?: string[];
    suggestedFilePath?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { bucket, key, userId, documentId } = body;

        if (!bucket || !key || !userId || !documentId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: bucket, key, userId, documentId' })
            };
        }

        const { contentType, fileSize } = await s3Service.getS3ObjectMetadata({ bucket, key });

        const fileBuffer = await s3Service.getDocumentFromS3({ bucket, key });

        const toProcessSync = SYNC_FILE_TYPES.includes(contentType) && fileSize <= MAX_SYNC_FILE_SIZE;

        let textractResult: TextractResult;
        let textExtractionMethod: 'sync' | 'async' = 'async';

        if (toProcessSync) {
            textExtractionMethod = 'sync';
            textractResult = await textractService.analyzeDocumentImage(new Uint8Array(fileBuffer));

            const bedrockResult = await bedrockService.cleanExtractedTextWithBedrock({
                modelId: BEDROCK_MODEL_ID,
                extractedText: textractResult.text,
                currentFilePaths: [],
                averageConfidence: textractResult.confidence,
            })

            const { cleanedText, tags, suggestedFilePath } = bedrockResult;

            return {
                statusCode: 200,
                body: JSON.stringify({
                    documentId,
                    userId,
                    textExtractionMethod,
                    cleanedText,
                    tags,
                    suggestedFilePath
                } satisfies ProcessDocumentResult)
            }
        }

    } catch (error) {
        console.error('Upload processing failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to process upload: ${error}` })
        };
    }
}