import {S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, S3ServiceException} from '@aws-sdk/client-s3';
import { UploadFileParams, MoveTempToFinalPathParams, UploadExtractedTextParams, getDocumentFromS3Params, deleteDocumentFromS3Params, S3UploadResult } from '../types/document-types';

import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function uploadToTempPath({bucket, fileBuffer, contentType, userId, originalFileName}: UploadFileParams): Promise<S3UploadResult> {
    try {
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new Error('File buffer cannot be empty');
        }

        if (!originalFileName) {
            throw new Error('Original file name is required');
        }

        const tempKey = `temp/${userId}/${uuidv4()}-${originalFileName.replace(/[^\w.-]/g, '_')}`;
        
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: tempKey,
            Body: fileBuffer,
            ContentType: contentType,
            Metadata: {
                'uploaded-by': userId,
                'original-filename': originalFileName
            }
        });
        
        await s3Client.send(command);
        
        return {
            key: tempKey,
            url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${tempKey}`,
        };
    } catch (error) {
        if (error instanceof S3ServiceException) {
            throw new Error(`Failed to upload file to temp path: ${error.message}`);
        }
        throw new Error('Unexpected error during file upload');
    }
}

export async function moveTempToFinalPath({bucket, userId, documentId, tempKey}: MoveTempToFinalPathParams): Promise<S3UploadResult> {
    try {
        if (!tempKey.startsWith(`temp/${userId}/`)) {
            throw new Error(`Invalid temp path: ${tempKey} does not belong to user ${userId}`);
        }

        const finalKey = `documents/${userId}/${documentId}`;
        
        // Copy the object to the final path
        const copyCommand = new CopyObjectCommand({
            Bucket: bucket,
            Key: finalKey,
            CopySource: `${bucket}/${tempKey}`
        });
        
        await s3Client.send(copyCommand);
        
        // Delete the temporary object
        try {
            const deleteCommand = new DeleteObjectCommand({
                Bucket: bucket,
                Key: tempKey
            });

            await s3Client.send(deleteCommand);
        } catch (deleteError) {
            console.warn(`Failed to delete temp file ${tempKey}`, {
                error: deleteError,
                documentId,
                userId,
                finalKey
            });
            // Log the error but do not throw, as the copy operation was successful
        }

        return {
            key: finalKey,
            url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalKey}`,
        };
    } catch (error) {
         if (error instanceof S3ServiceException) {
            throw new Error(`Failed to move file from temp to final path: ${error.message}`);
        }
        throw new Error(`Unexpected error during file moving: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function uploadExtractedText({bucket, documentId, userId, extractedText}: UploadExtractedTextParams): Promise<S3UploadResult> {
    try {
        if (!extractedText || extractedText.length === 0) {
            throw new Error('Extracted text cannot be empty');
        }

        if (!documentId || !userId) {
            throw new Error('Document ID and User ID are required');
        }

        const key = `extracted-texts/${userId}/${documentId}.txt`;

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: extractedText,
            ContentType: 'text/plain'
        });

        await s3Client.send(command);

        return {
            key: key,
            url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        };
    } catch (error) {
        if (error instanceof S3ServiceException) {
            throw new Error(`Failed to upload extracted text: ${error.message}`);
        }
        throw new Error(`Unexpected error during file upload: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentFromS3({bucket, key}: getDocumentFromS3Params): Promise<Buffer> {
    try {
        if (!bucket || !key) {
            throw new Error('Bucket and key are required to retrieve the document');
        }

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error(`Document not found at ${key}`);
        }

        return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
        if (error instanceof S3ServiceException) {
            throw new Error(`Failed to get document: ${error.message}`);
        }
        throw new Error(`Unexpected error during document retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteDocumentFromS3({bucket, key}: deleteDocumentFromS3Params): Promise<boolean> {
    try {
        if (!bucket || !key) {
            throw new Error('Bucket and key are required to delete the document');
        }

        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key
        });

        const response = await s3Client.send(command);

        if (response.$metadata.httpStatusCode !== 204) {
            throw new Error(`Failed to delete document at ${key}`);
        }
        
        return true; // Return true if deletion was successful
    } catch (error) {
        if (error instanceof S3ServiceException) {
            throw new Error(`Failed to delete document: ${error.message}`);
        }
        throw new Error(`Unexpected error during document deletion: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}