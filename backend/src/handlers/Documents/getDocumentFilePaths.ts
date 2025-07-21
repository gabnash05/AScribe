import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2
} from 'aws-lambda';

import { getDocumentFilePathFromDynamoDB } from '../../services/dynamoDBService';

const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE!;

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const userId = event.pathParameters?.userId;

    if (!userId) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Missing required path parameter: userId' }),
        };
    }

    try {
        const filePaths = await getDocumentFilePathFromDynamoDB({
            tableName: DOCUMENTS_TABLE,
            userId,
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filePaths }),
        };
    } catch (error) {
        console.error('Error getting file paths:', error);

        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Failed to retrieve document file paths',
            }),
        };
    }
};
