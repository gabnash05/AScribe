import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    DetectDocumentTextCommand,
    GetDocumentTextDetectionCommand,
    TextractServiceException,
    DocumentLocation,
    Block   
} from '@aws-sdk/client-textract';

import { StartDocumentTextDetectionParams, startDocumentTextDetectionParams } from '../types/textract-types'
import formatTextractJobTag from '../utils/formatTextractJobTag';

const textractClient = new TextractClient({ region: process.env.AWS_REGION });

export interface TextractResult {
    text: string;
    pageCount?: number;
    confidence?: number;
    blocks?: Block[];
}

export async function analyzeDocumentImage(documentBytes: Uint8Array): Promise<TextractResult> {
    try {
        if (!documentBytes || documentBytes.length === 0) {
            throw new Error('Document bytes cannot be empty');
        }

        const command = new DetectDocumentTextCommand({
            Document: { Bytes: documentBytes }
        });

        const response = await textractClient.send(command);

        return processTextractResponse({ Blocks: response.Blocks });
    } catch (error) {
        if (error instanceof TextractServiceException) {
            throw new Error(`Failed to analyze document image: ${error.message}`);
        }
        throw new Error(`Unexpected error during image analysis: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function startDocumentTextDetection({
    bucket,
    key,
    userId,
    documentId,
    snsTopicArn,
    roleArn
}: StartDocumentTextDetectionParams): Promise<startDocumentTextDetectionParams> {
    try {
        if (!bucket || !key) {
            throw new Error('Bucket and key are required to start Textract job');
        }

        if (!userId || !documentId) {
            throw new Error('User ID and Document ID are required for job tagging');
        }

        if (!snsTopicArn || !roleArn) {
            throw new Error('SNS Topic ARN and Role ARN are required for notifications');
        }

        const documentLocation: DocumentLocation = {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        };

        const command = new StartDocumentTextDetectionCommand({
            DocumentLocation: documentLocation,
            NotificationChannel: {
                RoleArn: roleArn,
                SNSTopicArn: snsTopicArn
            },
            JobTag: formatTextractJobTag(userId, documentId),
        });

        const response = await textractClient.send(command);

        if (!response.JobId) {
            throw new Error('Textract job failed to start');
        }

        return {
            success: true,
            message: 'Textract job started successfully',
            jobId: response.JobId 
        };
    } catch (error) {
        if (error instanceof TextractServiceException) {
            throw new Error(`Failed to start Textract job: ${error.message}`);
        }
        throw new Error(`Unexpected error during job start: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentAnalysisResults(jobId: string): Promise<TextractResult> {
    try {
        if (!jobId) {
            throw new Error('Job ID is required to retrieve Textract results');
        }

        let paginationToken: string | undefined;
        let allBlocks: Block[] = [];
        let pageCount = 0;

        do {
            const command = new GetDocumentTextDetectionCommand({
                JobId: jobId,
                NextToken: paginationToken
            });

            const response = await textractClient.send(command);

            if (response.Blocks) {
                allBlocks.push(...response.Blocks);
            }

            if (response.DocumentMetadata?.Pages) {
                pageCount = response.DocumentMetadata.Pages;
            }

            paginationToken = response.NextToken;
        } while (paginationToken);

        return processTextractResponse({
            Blocks: allBlocks,
            pageCount
        });
    } catch (error) {
        if (error instanceof TextractServiceException) {
            throw new Error(`Failed to retrieve Textract job results: ${error.message}`);
        }
        throw new Error(`Unexpected error during result retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

// --- Pure Textract Helper Functions --- //
function processTextractResponse(response: { Blocks?: Block[]; pageCount?: number }): TextractResult {
    const blocks = response.Blocks || [];
    const lines = blocks.filter(block => block.BlockType === 'LINE');

    return {
        text: lines.map(line => line.Text || '').join('\n'),
        pageCount: response.pageCount || blocks.filter(b => b.BlockType === 'PAGE').length,
        confidence: calculateAverageConfidence(lines),
        blocks
    };
}

function calculateAverageConfidence(lines: Block[]): number {
    if (lines.length === 0) return 0;
    const total = lines.reduce((sum, line) => sum + (line.Confidence || 0), 0);
    return total / lines.length;
}