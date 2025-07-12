import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi, LambdaIntegration, CognitoUserPoolsAuthorizer, Cors, AuthorizationType, Method } from 'aws-cdk-lib/aws-apigateway';
import { MockIntegration, PassthroughBehavior } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';

import { AscribeAppProps } from '../types/ascribe-app-types';

interface APIGatewayStackProps extends AscribeAppProps {
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    lambdas: {
        finalizeUploadLambda: IFunction;
        getDocumentLambda: IFunction;
        getDocumentsLambda: IFunction;
        updateDocumentLambda: IFunction;
        deleteDocumentLambda: IFunction;
        getExtractedTextLambda: IFunction;
        updateExtractedTextLambda: IFunction;
        deleteExtractedTextLambda: IFunction;
        updateTagsLambda: IFunction;
        createSummaryLambda: IFunction;
        getSummaryLambda: IFunction;
        updateSummaryLambda: IFunction;
        deleteSummaryLambda: IFunction;
        createQuestionsLambda: IFunction;
        getQuestionsLambda: IFunction;
        getQuestionLambda: IFunction;
        updateQuestionLambda: IFunction;
        deleteQuestionLambda: IFunction;
        searchDocumentsLambda: IFunction;
        initializeSearchIndexLambda: IFunction;
    }
    textractNotificationTopic: Topic;
}

export class APIGatewayStack extends Stack {
    public readonly restApi: RestApi;


    constructor(scope: Construct, id: string, props: APIGatewayStackProps) {
        super(scope, id, props);

        const { userPool } = props;

        const {
            finalizeUploadLambda,
            getDocumentLambda,
            getDocumentsLambda,
            updateDocumentLambda,
            deleteDocumentLambda,
            getExtractedTextLambda,
            updateExtractedTextLambda,
            deleteExtractedTextLambda,
            updateTagsLambda,
            createSummaryLambda,
            getSummaryLambda,
            updateSummaryLambda,
            deleteSummaryLambda,
            createQuestionsLambda,
            getQuestionsLambda,
            getQuestionLambda,
            updateQuestionLambda,
            deleteQuestionLambda,
            searchDocumentsLambda,
            initializeSearchIndexLambda
        } = props.lambdas;

        this.restApi = new RestApi(this, 'AScribeRestApi', {
            description: 'AScribe REST API',
            defaultCorsPreflightOptions: {
                allowHeaders: ['Authorization', 'Content-Type'],
                allowMethods: Cors.ALL_METHODS,
                allowOrigins: props.stage === 'dev' ? Cors.ALL_ORIGINS : ['https://example.com']  // TODO: restrict in production
            },
        });

        const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
        });

        // Documents 
        this.addLambdaRoute('documents', 'GET', getDocumentsLambda, authorizer, props);

        // Search
        this.addLambdaRoute('documents/{userId}/search', 'POST', searchDocumentsLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/search/initialize', 'POST', initializeSearchIndexLambda, authorizer, props);

        // Individual Document
        this.addLambdaRoute('documents/{userId}/{documentId}', 'GET', getDocumentLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}', 'PUT', updateDocumentLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}', 'DELETE', deleteDocumentLambda, authorizer, props);

        this.addLambdaRoute('documents/{userId}/{documentId}/finalize', 'POST', finalizeUploadLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/tags', 'PUT', updateTagsLambda, authorizer, props);

        // Extracted Text
        this.addLambdaRoute('documents/{userId}/{documentId}/text', 'GET', getExtractedTextLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/text', 'PUT', updateExtractedTextLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/text', 'DELETE', deleteExtractedTextLambda, authorizer, props);

        // Summary
        this.addLambdaRoute('documents/{userId}/{documentId}/summary', 'POST', createSummaryLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/summary', 'GET', getSummaryLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/summary', 'PUT', updateSummaryLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/summary', 'DELETE', deleteSummaryLambda, authorizer, props);

        // Questions
        this.addLambdaRoute('documents/{userId}/{documentId}/questions', 'POST', createQuestionsLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/questions', 'GET', getQuestionsLambda, authorizer, props);

        this.addLambdaRoute('documents/{userId}/{documentId}/questions/{questionId}', 'GET', getQuestionLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/questions/{questionId}', 'PUT', updateQuestionLambda, authorizer, props);
        this.addLambdaRoute('documents/{userId}/{documentId}/questions/{questionId}', 'DELETE', deleteQuestionLambda, authorizer, props);

        // Add Optins to each unique route
        [
        'documents',
        'documents/{userId}',
        'documents/{userId}/{documentId}',
        'documents/{userId}/{documentId}/finalize',
        'documents/{userId}/{documentId}/tags',
        'documents/{userId}/{documentId}/text',
        'documents/{userId}/{documentId}/summary',
        'documents/{userId}/{documentId}/questions',
        'documents/{userId}/{documentId}/questions/{questionId}',
        'documents/{userId}/search',
        'documents/{userId}/search/initialize',
        ].forEach(path => this.addOptionsMethod(path, props));
    }

    private addLambdaRoute(path: string, method: string, lambdaFn: IFunction, authorizer: CognitoUserPoolsAuthorizer, props: APIGatewayStackProps): void {
        const pathSegments = path.split('/');
        let currentResource = this.restApi.root;

        for (const segment of pathSegments) {
            const existingResource = currentResource.getResource(segment);
            currentResource = existingResource ?? currentResource.addResource(segment);
        }

        currentResource.addMethod(method, new LambdaIntegration(lambdaFn), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        });
    }

    private addOptionsMethod(path: string, props: APIGatewayStackProps): void {
        const resource = this.restApi.root.resourceForPath(path);
        
        // Check if OPTIONS method already exists
        const hasOptionsMethod = resource.node.children.some(child => {
            return child instanceof Method && child.httpMethod === 'OPTIONS';
        });

        if (!hasOptionsMethod) {
            resource.addMethod('OPTIONS', 
                new MockIntegration({
                    integrationResponses: [{
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': "'Authorization,Content-Type,X-Amz-Date,X-Amz-Security-Token,X-Api-Key'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE,PATCH'",
                        }
                    }],
                    passthroughBehavior: PassthroughBehavior.NEVER,
                    requestTemplates: {
                        "application/json": '{"statusCode": 200}'
                    }
                }),
                {
                    methodResponses: [{
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': true,
                            'method.response.header.Access-Control-Allow-Origin': true,
                            'method.response.header.Access-Control-Allow-Methods': true,
                        }
                    }]
                }
            );
        }
    }
}
