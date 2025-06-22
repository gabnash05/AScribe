import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, DynamoDBServiceException } from "@aws-sdk/client-dynamodb";

import { SaveDocumentParams, GetDocumentParams, UpdateDocumentParams, DocumentRecord, UpdateDocumentRecord } from "../types/dynamoDB-types";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export async function saveDocumentToDynamoDB({tableName, document}: SaveDocumentParams): Promise<void> {
    try {
        const command = new PutItemCommand({
            TableName: tableName,
            Item: {
                userId: { S: document.userId },
                documentId: { S: document.documentId },
                fileKey: { S: document.fileKey },
                originalFilename: { S: document.originalFilename },
                uploadDate: { S: document.uploadDate },
                status: { S: document.status },
                tags: { SS: document.tags },
                extractedTextId: { S: document.extractedTextId },
            }
        });

        await dynamoDBClient.send(command)
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to save document to DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document save: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentFromDynamoDB({tableName, userId, documentId}: GetDocumentParams): Promise<DocumentRecord | null> {
    try {
        const command = new GetItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: userId },
                documentId: { S: documentId }
            }
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Item) {
            return null; // Document not found
        }

        return {
            userId: response.Item.userId.S!,
            documentId: response.Item.documentId.S!,
            fileKey: response.Item.fileKey.S!,
            originalFilename: response.Item.originalFilename.S!,
            uploadDate: response.Item.uploadDate.S!,
            status: response.Item.status.S! as 'temp' | 'verified',
            tags: response.Item.tags.SS || [],
            extractedTextId: response.Item.extractedTextId?.S!
        };
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get document from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function updateDocumentInDynamoDB({tableName, documentId, document}: UpdateDocumentParams): Promise<void> {
    try {
        const expressionParts: string[] = [];
        const attributeNames: Record<string, string> = {};
        const attributeValues: Record<string, any> = {};

        const keyMap: { [key: string]: string } = {
            fileKey: 'fileKey',
            originalFilename: 'originalFilename',
            uploadDate: 'uploadDate',
            status: 'status',
            tags: 'tags',
            extractedTextId: 'extractedTextId'
        };

        for (const [key, field] of Object.entries(keyMap)) {
            const value = (document as any)[key];
            if (value !== undefined) {
                const attrKey = `#${key}`;
                const valueKey = `:${key}`;
                expressionParts.push(`${attrKey} = ${valueKey}`);
                attributeNames[attrKey] = field;
                attributeValues[valueKey] = key === 'tags'
                    ? { SS: value }
                    : { S: value };
            }
        }

        if (expressionParts.length === 0) return;

        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: document.userId },
                documentId: { S: documentId }
            },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        });

        await dynamoDBClient.send(command);

    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update document in DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document update: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}
