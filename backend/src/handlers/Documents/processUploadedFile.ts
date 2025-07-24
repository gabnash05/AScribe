import { EventBridgeEvent } from 'aws-lambda';
import { getCurrentTimestamp } from '../../utils/timeUtils';
import * as s3Service from '../../services/s3Service';
import * as textractService from '../../services/textractService';
import * as bedrockService from '../../services/bedrockService';
import * as dynamoDBService from '../../services/dynamoDBService'

const DOCUMENTS_BUCKET = process.env.DOCUMENT_BUCKET || '';
const TEXTRACT_SNS_TOPIC_ARN = process.env.TEXTRACT_SNS_TOPIC_ARN || '';
const TEXTRACT_ROLE_ARN = process.env.TEXTRACT_ROLE_ARN || '';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || '';
const DOCUMENTS_TABLE_NAME = process.env.DOCUMENTS_TABLE || '';
const EXTRACTED_TEXTS_TABLE_NAME = process.env.EXTRACTED_TEXTS_TABLE || '';

const SYNC_FILE_TYPES = ['image/jpeg', 'image/png'];
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


type S3ObjectCreatedDetail = {
    bucket: { name: string };
    object: { key: string };
};

export const handler = async (event: EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>) => {
    try {
        console.info('Received event:', JSON.stringify(event, null, 2));

        const bucket = event.detail.bucket.name;
        const key = decodeURIComponent(event.detail.object.key.replace(/\+/g, ' '));

        console.info('Triggered by EventBridge:', { bucket, key });

        // Get Metadata
        const metadata = await s3Service.getS3ObjectMetadata({ bucket, key });
        const { userId, documentId, contentType, fileSize } = metadata;
        const originalFileName = key.split('/').pop() || 'unknown';

        // Determine whether to use Sync or Async Textract
        let extractionMethod: 'sync' | 'async';
        let textractJobId: string | undefined;
        let extractedText = '';
        let averageConfidence = 0;

        const isSync = SYNC_FILE_TYPES.includes(contentType) && fileSize <= MAX_SYNC_FILE_SIZE;

        if (isSync) {
            console.info('Using synchronous Textract method...');
            const documentBytes = await s3Service.getDocumentFromS3({ bucket, key });
            const result = await textractService.analyzeDocumentImage(documentBytes);

            extractedText = result.text;
            averageConfidence = result.confidence;
            extractionMethod = 'sync';
        } else {
            console.info('Using asynchronous Textract method...');
            const asyncResult = await textractService.startDocumentTextDetection({
                bucket,
                key,
                userId,
                documentId,
                snsTopicArn: TEXTRACT_SNS_TOPIC_ARN,
                roleArn: TEXTRACT_ROLE_ARN,
            })

            textractJobId = asyncResult.jobId;
            extractionMethod = 'async';
        }

        // If async, just store status and return
        if (extractionMethod === 'async') {
            await dynamoDBService.saveDocumentToDynamoDB({
                tableName: DOCUMENTS_TABLE_NAME,
                document: {
                    userId,
                    documentId,
                    fileKey: key,
                    filePath: '',
                    originalFilename: originalFileName,
                    uploadDate: getCurrentTimestamp(),
                    contentType,
                    fileSize,
                    textExtractionMethod: extractionMethod,
                    status: 'processing',
                    tags: [''],
                    extractedTextId: '', 
                    textractJobId,
                }
            });

            console.info('Document processing started asynchronously:', {
                message: 'Async Textract started',
                documentId,
                userId,
                textExtractionMethod: 'async',
                textractJobId
            });

            return;
        }

        // Process the extracted text with Bedrock
        const currentFilePaths = await dynamoDBService.getDocumentFilePathFromDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
        });

        const filePaths = currentFilePaths.map(item => item.filePath);

        const cleaned = await bedrockService.cleanExtractedTextWithBedrock({
            modelId: BEDROCK_MODEL_ID,
            extractedText,
            averageConfidence,
            currentFilePaths: filePaths,
        });
        
        const { cleanedText, tags, suggestedFilePath } = cleaned;

        // Store Cleaned Text in S3
        const cleanedTextResult = await s3Service.uploadExtractedText({
            bucket: DOCUMENTS_BUCKET,
            documentId,
            userId,
            extractedText: cleanedText,
        });

        // Move file from temp to final S3 path
        const movedFile = await s3Service.moveTempToFinalPath({
            bucket: DOCUMENTS_BUCKET,
            userId,
            documentId,
            tempKey: key
        });

        // Save exttracted text metadata in DynamoDB
        await dynamoDBService.saveExtractedTextToDynamoDB({
            tableName: EXTRACTED_TEXTS_TABLE_NAME,
            extractedTextRecord: {
                extractedTextId: cleanedTextResult.key,
                documentId,
                userId,
                processedDate: getCurrentTimestamp(),
                verified: false,
                textFileKey: cleanedTextResult.key,
                averageConfidence: averageConfidence,
            }
        });

        // Save document metadata in DynamoDB
        await dynamoDBService.saveDocumentToDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            document: {
                userId,
                documentId,
                fileKey: movedFile.key,
                filePath: suggestedFilePath,
                originalFilename: originalFileName,
                uploadDate: getCurrentTimestamp(),
                contentType,
                fileSize,
                textExtractionMethod: extractionMethod,
                status: 'cleaned',
                tags: tags,
                extractedTextId: cleanedTextResult.key, 
                textractJobId,
            }
        });
        
        console.info('Document processed successfully:', {
            documentId,
            userId,
            textExtractionMethod: 'sync',
            originalFileName,
            tags,
            suggestedFilePath
        } as ProcessDocumentResult);

    } catch (error) {
        console.error('Failed to process uploaded file:', error);

        // Attempt to mark the document as 'failed'
        try {
            const bucket = event.detail.bucket.name;
            const key = decodeURIComponent(event.detail.object.key.replace(/\+/g, ' '));

            if (bucket && key) {
                const metadata = await s3Service.getS3ObjectMetadata({ bucket, key });
                const { userId, documentId } = metadata;

                if (userId && documentId) {
                    await dynamoDBService.updateDocumentStatus({
                        tableName: DOCUMENTS_TABLE_NAME,
                        userId,
                        documentId,
                        status: 'failed'
                    });

                    console.info('Marked document as failed in DynamoDB:', { userId, documentId });
                }
            }
        } catch (metadataError) {
            console.error('Failed to update document status to failed:', metadataError);
        }

        throw error;
    }
};