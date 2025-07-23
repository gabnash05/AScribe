import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const QUESTIONS_TABLE_NAME = process.env.QUESTIONS_TABLE!;

const dynamoDBClient = new DynamoDBClient({});

interface Question {
    questionId: string;
    documentId: string;
    tags?: string[];
    question: string;
    choices?: string[];
    answer: string;
    createdAt: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const { documentId } = event.pathParameters || {};

        if (!documentId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Missing documentId parameter',
                }),
            };
        }

        const command = new QueryCommand({
            TableName: QUESTIONS_TABLE_NAME,
            KeyConditionExpression: 'documentId = :documentId',
            ExpressionAttributeValues: {
                ':documentId': { S: documentId }
            }
        });

        const response = await dynamoDBClient.send(command);

        if (!response.Items || response.Items.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'No questions found for this document',
                }),
            };
        }

        const questions: Question[] = response.Items.map(item => {
            const unmarshalled = unmarshall(item);
            return {
                questionId: unmarshalled.questionsId,
                documentId: unmarshalled.documentId,
                tags:  Array.from(unmarshalled.tags),
                question: unmarshalled.question,
                choices: Array.from(unmarshalled.choices),
                answer: unmarshalled.answer,
                createdAt: unmarshalled.createdAt
            };
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(questions),
        };

    } catch (error: any) {
        console.error("Lambda error:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                stack: process.env.STAGE === 'dev' ? error.stack : undefined
            }),
        };
    }
};