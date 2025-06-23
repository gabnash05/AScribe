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
    GetDocumentsByUserdParams
} from "../types/dynamoDB-types";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

// ---------- DOCUMENTS ----------
export async function saveDocumentToDynamoDB({ tableName, document }: SaveDocumentParams): Promise<DynamoDBSaveResult> {
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

export async function getDocumentsByUserFromDynamoDB({ tableName, userId }: GetDocumentsByUserdParams): Promise<DocumentRecord[]> {
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
            originalFilename: item.originalFilename.S!,
            uploadDate: item.uploadDate.S!,
            status: item.status.S! as 'temp' | 'verified',
            tags: item.tags?.SS || [],
            extractedTextId: item.extractedTextId?.S!
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

export async function updateDocumentInDynamoDB({ tableName, userId, documentId, document }: UpdateDocumentParams): Promise<DynamoDBUpdateResult> {
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
            processedDate: { S: extractedTextRecord.processedDate },
            verified: { BOOL: extractedTextRecord.verified },
            textFileKey: { S: extractedTextRecord.textFileKey },
        };

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

// TODO:
// - Log errors to CloudWatch
// - Functions for getting multiple records