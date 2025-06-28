import { S3Event } from 'aws-lambda';
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

export const handler = async (event: S3Event) => {
    
}