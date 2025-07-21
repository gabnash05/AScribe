import { 
    DynamoDBClient, 
    PutItemCommand, 
    GetItemCommand, 
    UpdateItemCommand, 
    DynamoDBServiceException, 
    DeleteItemCommand, 
    AttributeValue,
    QueryCommand 
} from "@aws-sdk/client-dynamodb";

import { unmarshall } from '@aws-sdk/util-dynamodb';

import { 
    SaveDocumentParams, 
    GetDocumentParams, 
    UpdateDocumentParams, 
    DocumentRecord, 
    DeleteDocumentParams, 
    UpdateExtractedTextParams, 
    SaveExtractedTextParams, 
    DeleteExtractedTextParams,
    SaveSummaryParams,
    SaveQuestionParams,
    UpdateSummaryParams,
    UpdateQuestionParams,
    DeleteQuestionParams,
    DeleteSummaryParams,
    DynamoDBSaveResult,
    DynamoDBUpdateResult,
    DynamoDBDeleteResult,
    GetDocumentsByUserParams,
    DocumentStatus,
    UpdateDocumentStatusParams,
    GetDocumentsByJobIdParams,
    GetExtractedTextParams,
    ExtractedTextRecord,
} from "../types/dynamoDB-types";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// ---------- DOCUMENTS ----------
export async function saveDocumentToDynamoDB({ tableName, document }: SaveDocumentParams): Promise<DynamoDBSaveResult> {
    try {
        const item: Record<string, AttributeValue> = {
            userId: { S: document.userId },
            documentId: { S: document.documentId },
            fileKey: { S: document.fileKey },
            filePath: { S: document.filePath },
            originalFilename: { S: document.originalFilename },
            uploadDate: { S: document.uploadDate },
            contentType: { S: document.contentType },
            fileSize: { N: document.fileSize.toString() },
            textExtractionMethod: { S: document.textExtractionMethod },
            status: { S: document.status },
            tags: { SS: document.tags },
            extractedTextId: { S: document.extractedTextId }
        };
        if (document.textractJobId) {
            item.textractJobId = { S: document.textractJobId };
        }

        const command = new PutItemCommand({
            TableName: tableName,
            Item: item
        });

        await dynamoDBClient.send(command)

        return {
            success: true,
            message: 'Document saved successfully',
            item: document,
        };

    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to save document to DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document save: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentFromDynamoDB({ tableName, userId, documentId }: GetDocumentParams): Promise<DocumentRecord | null> {
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
            filePath: response.Item.filePath.S!,
            originalFilename: response.Item.originalFilename.S!,
            uploadDate: response.Item.uploadDate.S!,
            contentType: response.Item.contentType.S!,
            fileSize: parseInt(response.Item.fileSize.N!, 10),
            textExtractionMethod: response.Item.textExtractionMethod.S! as 'sync' | 'async',
            status: response.Item.status.S! as 'temp' | 'verified',
            tags: response.Item.tags.SS || [],
            extractedTextId: response.Item.extractedTextId?.S!,
            textractJobId: response.Item.textractJobId?.S || undefined
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

export async function getDocumentsByUserFromDynamoDB({ tableName, userId }: GetDocumentsByUserParams): Promise<DocumentRecord[]> {
    try {
        const command = new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': { S: userId}
            }
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Items || response.Items.length === 0) {
            return []; // Document not found
        }
        
        return response.Items.map((item): DocumentRecord => ({
            userId: item.userId.S!,
            documentId: item.documentId.S!,
            fileKey: item.fileKey.S!,
            filePath: item.filePath.S!,
            originalFilename: item.originalFilename.S!,
            uploadDate: item.uploadDate.S!,
            contentType: item.contentType.S!,
            fileSize: parseInt(item.fileSize.N!, 10),
            textExtractionMethod: item.textExtractionMethod.S! as 'sync' | 'async',
            status: item.status.S! as 'temp' | 'verified',
            tags: item.tags?.SS || [],
            extractedTextId: item.extractedTextId?.S!,
            textractJobId: item.textractJobId?.S || undefined
        }));

    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get documents by user from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document retrieval by user: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentStatusFromDynamoDB({ tableName, userId, documentId }: GetDocumentParams): Promise<DocumentStatus | null> {
    try {
        const command = new GetItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: userId },
                documentId: { S: documentId }
            },
            ProjectionExpression: 'status'
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Item) {
            return null; 
        }

        const status = response.Item.status.S;

        return status as DocumentStatus;
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get documents status from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document status retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentFilePathFromDynamoDB({ tableName, userId }: {tableName: string, userId: string}): Promise<string[]> {
    try {
        const command = new QueryCommand({
            TableName: tableName,
            IndexName: 'userId-index',
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: {
                ':uid': { S: userId },
            },
            ProjectionExpression: 'filePath'
        })

        const response = await dynamoDBClient.send(command);

        if (!response.Items || response.Items.length === 0) return [];

        return response.Items
            .map(item => item.filePath?.S)
            .filter((path): path is string => !!path);

    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get document file path from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document file path retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getDocumentByJobIdInDynamoDB({
    tableName,
    jobId
}: GetDocumentsByJobIdParams): Promise<DocumentRecord | null> {
    try {
        const command = new QueryCommand({
            TableName: tableName,
            IndexName: 'textractJob-index',
            KeyConditionExpression: 'textractJobId = :tag',
            ExpressionAttributeValues: {
                ':tag': { S: jobId }
            },
            Limit: 1
        });

        const result = await dynamoDBClient.send(command);

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        const document = unmarshall(result.Items[0]) as DocumentRecord;
        return document;
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get document by jobId from DynamoDB: ${error.message}`);
        }
        throw new Error(
            `Unexpected error during document retrieval by jobId: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        );
    }
}
export async function updateDocumentInDynamoDB({ tableName, userId, documentId, document }: UpdateDocumentParams): Promise<DynamoDBUpdateResult> {
    try {
        const expressionParts: string[] = [];
        const attributeNames: Record<string, string> = {};
        const attributeValues: Record<string, any> = {};

        const keyMap: { [key: string]: string } = {
            fileKey: 'fileKey',
            filePath: 'filePath',
            originalFilename: 'originalFilename',
            uploadDate: 'uploadDate',
            contentType: 'contentType',
            fileSize: 'fileSize',
            textExtractionMethod: 'textExtractionMethod',
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

        if (expressionParts.length === 0) return {
            success: false,
            message: 'No fields to update'
        };

        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: userId },
                documentId: { S: documentId }
            },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Document updated successfully',
            item: {
                ...document
            }
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update document in DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document update: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function updateDocumentStatus({ tableName, userId, documentId, status}: UpdateDocumentStatusParams): Promise<DynamoDBUpdateResult> {
    try {
        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: userId },
                documentId: { S: documentId }
            },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': { S: status }
            }
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Document status updated successfully',
            item: { status }
        };
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update document status: ${error.message}`);
        }
        throw new Error(`Unexpected error during status update: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteDocumentFromDynamoDB({ tableName, userId, documentId }: DeleteDocumentParams): Promise<DynamoDBDeleteResult> {
    try {
        const command = new DeleteItemCommand({
            TableName: tableName,
            Key: {
                userId: { S: userId },
                documentId: { S: documentId }
            }
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Document deleted successfully',
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to delete document from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during document deletion: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

// ---------- EXTRACTED TEXTS ----------
export async function saveExtractedTextToDynamoDB({ tableName, extractedTextRecord }: SaveExtractedTextParams): Promise<DynamoDBSaveResult> {
    try {
        const item: Record<string, AttributeValue> = {
            extractedTextId: { S: extractedTextRecord.extractedTextId },
            documentId: { S: extractedTextRecord.documentId },
            userId: { S: extractedTextRecord.userId },
            processedDate: { S: extractedTextRecord.processedDate },
            verified: { BOOL: extractedTextRecord.verified },
            textFileKey: { S: extractedTextRecord.textFileKey },
            averageConfidence: { N: extractedTextRecord.averageConfidence.toString() },        };

        if (extractedTextRecord.summaryId) {
            item.summaryId = { S: extractedTextRecord.summaryId };
        }

        if (extractedTextRecord.questionsId && extractedTextRecord.questionsId.length > 0) {
            item.questionsId = { SS: extractedTextRecord.questionsId };
        }

        if (typeof extractedTextRecord.tokens === 'number') {
            item.tokens = { N: extractedTextRecord.tokens.toString() };
        }

        const command = new PutItemCommand({
            TableName: tableName,
            Item: item
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Extracted text saved successfully',
            item: extractedTextRecord,
        };
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to save extracted text to DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during extracted text save: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function getExtractedTextInDynamoDB({ tableName, extractedTextId, documentId }: GetExtractedTextParams): Promise<ExtractedTextRecord | null> {
    try {
        const command = new GetItemCommand({
            TableName: tableName,
            Key: {
                extractedTextId: { S: extractedTextId },
                documentId: { S: documentId }
            }
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Item) {
            return null;
        }

        return {
            extractedTextId: response.Item.extractedTextId.S!,
            documentId: response.Item.documentId.S!,
            userId: response.Item.userId.S!,
            processedDate: response.Item.processedDate.S!,
            verified: response.Item.verified.BOOL!,
            textFileKey: response.Item.textFileKey.S!,
            averageConfidence: parseFloat(response.Item.averageConfidence.N!),
            summaryId: response.Item.summaryId?.S || undefined,
            questionsId: response.Item.questionsId?.SS || [],
            tokens: response.Item.tokens ? parseInt(response.Item.tokens.N!, 10) : undefined
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to get extracted text from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during extracted text retrieval: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function updateExtractedTextInDynamoDB({ tableName, extractedTextId, documentId, extractedTextRecord }: UpdateExtractedTextParams): Promise<DynamoDBUpdateResult> {
    try {
        const expressionParts: string[] = [];
        const attributeValues: Record<string, AttributeValue> = {};
        const attributeNames: Record<string, string> = {};

        if (extractedTextRecord.verified !== undefined) {
            expressionParts.push('#verified = :verified');
            attributeNames['#verified'] = 'verified';
            attributeValues[':verified'] = { BOOL: extractedTextRecord.verified };
        }

        if (extractedTextRecord.processedDate !== undefined) {
            expressionParts.push('#processedDate = :processedDate');
            attributeNames['#processedDate'] = 'processedDate';
            attributeValues[':processedDate'] = { S: extractedTextRecord.processedDate };
        }

        if (extractedTextRecord.textFileKey !== undefined) {
            expressionParts.push('#textFileKey = :textFileKey');
            attributeNames['#textFileKey'] = 'textFileKey';
            attributeValues[':textFileKey'] = { S: extractedTextRecord.textFileKey };
        }

        if (extractedTextRecord.averageConfidence !== undefined) {
            expressionParts.push('#averageConfidence = :averageConfidence');
            attributeNames['#averageConfidence'] = 'averageConfidence';
            attributeValues[':averageConfidence'] = { N: extractedTextRecord.averageConfidence.toString() };
        }

        if (extractedTextRecord.summaryId !== undefined) {
            expressionParts.push('#summaryId = :summaryId');
            attributeNames['#summaryId'] = 'summaryId';
            attributeValues[':summaryId'] = { S: extractedTextRecord.summaryId };
        }

        if (extractedTextRecord.tokens !== undefined) {
            expressionParts.push('#tokens = :tokens');
            attributeNames['#tokens'] = 'tokens';
            attributeValues[':tokens'] = { N: extractedTextRecord.tokens.toString() };
        }

        if (extractedTextRecord.questionsId !== undefined) {
            expressionParts.push('#questionsId = :questionsId');
            attributeNames['#questionsId'] = 'questionsId';
            attributeValues[':questionsId'] = { SS: extractedTextRecord.questionsId };
        }

        if (expressionParts.length === 0) return {
            success: false,
            message: 'No fields to update'
        };

        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                extractedTextId: { S: extractedTextId },
                documentId: { S: documentId },
            },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues,
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Extracted text updated successfully',
            item: {
                ...extractedTextRecord
            }
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update extracted text in DynamoDB: ${error.message}`);
        }
        throw new Error(
            `Unexpected error during extracted text update: ${
                error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteExtractedTextFromDynamoDB({ tableName, extractedTextId, documentId }: DeleteExtractedTextParams): Promise<DynamoDBDeleteResult> {
    try {
        const command = new DeleteItemCommand({
            TableName: tableName,
            Key: {
                extractedTextId: { S: extractedTextId },
                documentId: { S: documentId }
            }
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Extracted text deleted successfully',
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to delete extractedTextRecord from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during extractedTextRecord deletion: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

// ---------- SUMMARIES ----------

export async function saveSummary({ tableName, summary }: SaveSummaryParams): Promise<DynamoDBSaveResult> {
    try {
        const command = new PutItemCommand({
            TableName: tableName,
            Item: {
                documentId: { S: summary.documentId },
                summaryId: { S: summary.summaryId },
                summaryText: { S: summary.summaryText },
                createdAt: { S: summary.createdAt },
            },
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Summary saved successfully',
            item: summary,
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to save summary to DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during summary save: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function updateSummaryInDynamoDB({ tableName, documentId, summaryId, summary }: UpdateSummaryParams): Promise<DynamoDBUpdateResult> {
    try {
        const expressionParts: string[] = [];
        const attributeValues: Record<string, AttributeValue> = {};
        const attributeNames: Record<string, string> = {};

        if (summary.summaryText !== undefined) {
            expressionParts.push('#summaryText = :summaryText');
            attributeNames['#summaryText'] = 'summaryText';
            attributeValues[':summaryText'] = { S: summary.summaryText };
        }

        if (summary.createdAt !== undefined) {
            expressionParts.push('#createdAt = :createdAt');
            attributeNames['#createdAt'] = 'createdAt';
            attributeValues[':createdAt'] = { S: summary.createdAt };
        }

        if (expressionParts.length === 0) return {
            success: false,
            message: 'No fields to update'
        };

        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                documentId: { S: documentId },
                summaryId: { S: summaryId },
            },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Summary updated successfully',
            item: {
                ...summary
            }
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update summary in DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during summary update: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteSummaryFromDynamoDB({ tableName, documentId, summaryId }: DeleteSummaryParams): Promise<DynamoDBDeleteResult> {
    try {
        const command = new DeleteItemCommand({
            TableName: tableName,
            Key: {
                documentId: { S: documentId },
                summaryId: { S: summaryId }
            }
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Summary deleted successfully',
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to delete summary from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during summary deletion: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

// ---------- QUESTIONS ----------

export async function saveQuestionToDynamoDB({ tableName, question }: SaveQuestionParams): Promise<DynamoDBSaveResult> {
    try {
        const command = new PutItemCommand({
            TableName: tableName,
            Item: {
                documentId: { S: question.documentId },
                questionsId: { S: question.questionsId },
                tags: { SS: question.tags },
                question: { S: question.question },
                choices: { SS: question.choices },
                answer: { S: question.answer },
                createdAt: { S: question.createdAt },
            },
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Question saved successfully',
            item: question,
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to save question to DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during question save: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function updateQuestionInDynamoDB({ tableName, documentId, questionsId, question }: UpdateQuestionParams): Promise<DynamoDBUpdateResult> {
    try {
        const expressionParts: string[] = [];
        const attributeValues: Record<string, AttributeValue> = {};
        const attributeNames: Record<string, string> = {};

        if (question.question !== undefined) {
            expressionParts.push('#question = :question');
            attributeNames['#question'] = 'question';
            attributeValues[':question'] = { S: question.question };
        }

        if (question.answer !== undefined) {
            expressionParts.push('#answer = :answer');
            attributeNames['#answer'] = 'answer';
            attributeValues[':answer'] = { S: question.answer };
        }

        if (question.createdAt !== undefined) {
            expressionParts.push('#createdAt = :createdAt');
            attributeNames['#createdAt'] = 'createdAt';
            attributeValues[':createdAt'] = { S: question.createdAt };
        }

        if (question.tags !== undefined) {
            expressionParts.push('#tags = :tags');
            attributeNames['#tags'] = 'tags';
            attributeValues[':tags'] = { SS: question.tags };
        }

        if (question.choices !== undefined) {
            expressionParts.push('#choices = :choices');
            attributeNames['#choices'] = 'choices';
            attributeValues[':choices'] = { SS: question.choices };
        }

        if (expressionParts.length === 0) return {
            success: false,
            message: 'No fields to update'
        };

        const command = new UpdateItemCommand({
            TableName: tableName,
            Key: {
                documentId: { S: documentId },
                questionsId: { S: questionsId }
            },
            UpdateExpression: `SET ${expressionParts.join(', ')}`,
            ExpressionAttributeNames: attributeNames,
            ExpressionAttributeValues: attributeValues
        });

        await dynamoDBClient.send(command);

        return  {
            success: true,
            message: 'Question updated successfully',
            item: {
                ...question
            }
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to update question in DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during question update: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteQuestionFromDynamoDB({ tableName, documentId, questionsId }: DeleteQuestionParams): Promise<DynamoDBDeleteResult> {
    try {
        const command = new DeleteItemCommand({
            TableName: tableName,
            Key: {
                documentId: { S: documentId },
                questionsId: { S: questionsId }
            }
        });

        await dynamoDBClient.send(command);

        return {
            success: true,
            message: 'Question deleted successfully',
        }
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to delete question from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during question deletion: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function deleteQuestionsByDocumentIdFromDynamoDB({ tableName, documentId }: { tableName: string, documentId: string }): Promise<DynamoDBDeleteResult> {
    try {
        const command = new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'documentId = :documentId',
            ExpressionAttributeValues: {
                ':documentId': { S: documentId }
            }
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Items || response.Items.length === 0) {
            return { success: true, message: 'No questions found for the document' };
        }

        const deleteCommands = response.Items.map(item => new DeleteItemCommand({
            TableName: tableName,
            Key: {
                documentId: { S: item.documentId.S! },
                questionsId: { S: item.questionsId.S! }
            }
        }));

        for (const deleteCommand of deleteCommands) {
            await dynamoDBClient.send(deleteCommand);
        }

        return {
            success: true,
            message: 'Questions deleted successfully',
        };
    } catch (error) {
        if (error instanceof DynamoDBServiceException) {
            throw new Error(`Failed to delete questions by document ID from DynamoDB: ${error.message}`);
        }
        throw new Error(`Unexpected error during question deletion by document ID: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

// TODO:
// - Log errors to CloudWatch