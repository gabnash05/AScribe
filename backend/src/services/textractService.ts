import {
    TextractClient,
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
    TextractServiceException,
    StartDocumentTextDetectionCommandInput,
    GetDocumentTextDetectionCommandInput,
} from "@aws-sdk/client-textract";

import { StartTextExtractionParams, TextractStartResult, TextractGetResult } from "../types/textract-types";
import { DocumentLocation, NotificationChannel } from "@aws-sdk/client-textract";
import formatTextractJobTag from "../utils/formatTextractJobTag";

const textractClient = new TextractClient({ region: process.env.AWS_REGION });

// FILE FORMATS SUPPORTED BY TEXTRACT
// .pdf, .tiff, .jpg, .jpeg, .png, .bmp, .txt, .md

export async function startTextExtractionFromS3({
    bucket,
    key,
    userId,
    documentId,
    snsTopicArn,
    roleArn
}: StartTextExtractionParams): Promise<TextractStartResult> {
    try {
        const documentLocation: DocumentLocation = {
            S3Object: {
                Bucket: bucket,
                Name: key
            }
        };

        const notificationChannel: NotificationChannel = {
            SNSTopicArn: snsTopicArn,
            RoleArn: roleArn
        };

        const command = new StartDocumentTextDetectionCommand({
            DocumentLocation: documentLocation,
            NotificationChannel: notificationChannel,
            JobTag: formatTextractJobTag(userId, documentId),
        });

        const response = await textractClient.send(command);

        if (!response.JobId) {
            throw new Error('Failed to start Textract job: JobId not returned');
        }

        return {
            success: true,
            message: 'Textract job started successfully',
            jobId: response.JobId,
        }
    } catch (error) {
        if (error instanceof TextractServiceException) {
            throw new Error(`Textract error while starting job: ${error.message}`);
        }
        throw new Error(`Unexpected error while starting Textract job: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}
