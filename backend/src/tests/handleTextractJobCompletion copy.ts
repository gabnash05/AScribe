import { SNSEvent } from 'aws-lambda';
import { getCurrentTimestamp } from '../../utils/timeUtils';
import * as textractService from '../../services/textractService';
import * as s3Service from '../../services/s3Service';
import * as dynamoDBService from '../../services/dynamoDBService';
import * as bedrockService from '../../services/bedrockService';

const DOCUMENTS_BUCKET = process.env.DOCUMENT_BUCKET || '';
const DOCUMENTS_TABLE_NAME = process.env.DOCUMENTS_TABLE || '';
const EXTRACTED_TEXTS_TABLE_NAME = process.env.EXTRACTED_TEXTS_TABLE || '';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || '';

export const handler = async (event: SNSEvent): Promise<void> => {
    try {
        console.info('SNS Event received:', JSON.stringify(event, null, 2));

        const message = JSON.parse(event.Records[0].Sns.Message);
        const jobId = message.JobId;
        const status = message.Status;

        if (status !== 'SUCCEEDED') {
            console.warn(`Textract job ${jobId} failed with status: ${status}`);
            return;
        }

        // Get Textract results
        const textractResult = await textractService.getDocumentAnalysisResults(jobId);
        const extractedText = textractResult.text;
        const confidence = textractResult.confidence;

        // Extract job metadata from the job tag
        const jobTag = message.JobTag;
        if (!jobTag) {
            throw new Error('JobTag is missing from Textract completion message');
        }
        
        const parts = jobTag.split('||');
        if (parts.length !== 3 || parts[0] !== 'document') {
            throw new Error('Invalid JobTag format - expected document||userId||documentId');
        }
        const [, userId, documentId] = parts;

        // Get the original document metadata from DynamoDB
        const document = await dynamoDBService.getDocumentFromDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
            documentId
        });

        if (!document) {
            throw new Error(`Document not found for userId: ${userId}, documentId: ${documentId}`);
        }

        // Process the extracted text with Bedrock
        const currentFilePaths = await dynamoDBService.getDocumentFilePathFromDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
        }); 

        const cleaned = await bedrockService.cleanExtractedTextWithBedrock({
            modelId: BEDROCK_MODEL_ID,
            extractedText,
            averageConfidence: confidence,
            currentFilePaths,
        });

        const { cleanedText, tags, suggestedFilePath } = cleaned

        // Upload extracted text to S3
        const extractedTextResult = await s3Service.uploadExtractedText({
            bucket: DOCUMENTS_BUCKET,
            documentId,
            userId,
            extractedText: cleanedText,
        });

        // Move the original file from temp to final path
        const movedFile = await s3Service.moveTempToFinalPath({
            bucket: DOCUMENTS_BUCKET,
            userId,
            documentId,
            tempKey: document.fileKey
        });

        // Save extracted text metadata to DynamoDB
        await dynamoDBService.saveExtractedTextToDynamoDB({
            tableName: EXTRACTED_TEXTS_TABLE_NAME,
            extractedTextRecord: {
                extractedTextId: extractedTextResult.key,
                documentId,
                userId,
                processedDate: getCurrentTimestamp(),
                verified: false,
                textFileKey: extractedTextResult.key,
                averageConfidence: confidence,
            }
        });

        // Update the document record in DynamoDB
        await dynamoDBService.updateDocumentInDynamoDB({
            tableName: DOCUMENTS_TABLE_NAME,
            userId,
            documentId,
            document: {
                fileKey: movedFile.key,
                filePath: suggestedFilePath,
                status: 'cleaned',
                tags,
                extractedTextId: extractedTextResult.key,
            }
        });

        console.info('Successfully processed Textract job completion', {
            jobId,
            documentId,
            userId,
            textLength: textractResult.text.length,
            confidence: textractResult.confidence
        });

    } catch (error) {
        console.error('Error processing Textract job completion:', error);
        
        // If we have the documentId, update its status to failed
        if (event.Records[0]?.Sns?.Message) {
            try {
                const message = JSON.parse(event.Records[0].Sns.Message);
                const jobTag = message.JobTag;
                if (jobTag) {
                    const [_, userId, documentId] = jobTag.split('||');
                    if (userId && documentId) {
                        await dynamoDBService.updateDocumentStatus({
                            tableName: DOCUMENTS_TABLE_NAME,
                            userId,
                            documentId,
                            status: 'failed'
                        });
                    }
                }
            } catch (updateError) {
                console.error('Failed to update document status to failed:', updateError);
            }
        }
        
        throw error;
    }
};