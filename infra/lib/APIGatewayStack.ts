import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi, LambdaIntegration, CognitoUserPoolsAuthorizer, Cors, AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

import { AscribeAppProps } from '../types/ascribe-app-types';

interface APIGatewayStackProps extends AscribeAppProps {
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    lambdas: {
        uploadLambda: IFunction;
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
}

export class APIGatewayStack extends Stack {
    public readonly restApi: RestApi;

    constructor(scope: Construct, id: string, props: APIGatewayStackProps) {
        super(scope, id, props);

        const { userPool, userPoolClient } = props;

        const {
            uploadLambda,
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
        this.addLambdaRoute('documents', 'POST', uploadLambda, authorizer);
        this.addLambdaRoute('documents', 'GET', getDocumentsLambda, authorizer);

        // Search
        this.addLambdaRoute('documents/search', 'POST', searchDocumentsLambda, authorizer);
        this.addLambdaRoute('documents/search/initialize', 'POST', initializeSearchIndexLambda, authorizer);

        // Individual Document
        this.addLambdaRoute('documents/{documentId}', 'GET', getDocumentLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}', 'PUT', updateDocumentLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}', 'DELETE', deleteDocumentLambda, authorizer);

        this.addLambdaRoute('documents/{documentId}/finalize', 'POST', finalizeUploadLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/tags', 'PUT', updateTagsLambda, authorizer);

        // Extracted Text
        this.addLambdaRoute('documents/{documentId}/text', 'GET', getExtractedTextLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/text', 'PUT', updateExtractedTextLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/text', 'DELETE', deleteExtractedTextLambda, authorizer);

        // Summary
        this.addLambdaRoute('documents/{documentId}/summary', 'POST', createSummaryLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/summary', 'GET', getSummaryLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/summary', 'PUT', updateSummaryLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/summary', 'DELETE', deleteSummaryLambda, authorizer);

        // Questions
        this.addLambdaRoute('documents/{documentId}/questions', 'POST', createQuestionsLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/questions', 'GET', getQuestionsLambda, authorizer);

        this.addLambdaRoute('documents/{documentId}/questions/{questionId}', 'GET', getQuestionLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/questions/{questionId}', 'PUT', updateQuestionLambda, authorizer);
        this.addLambdaRoute('documents/{documentId}/questions/{questionId}', 'DELETE', deleteQuestionLambda, authorizer);
    private addLambdaRoute(path: string, method: string, lambdaFn: IFunction, authorizer: CognitoUserPoolsAuthorizer): void {
-       const resource = this.restApi.root.addResource(path);
+       const pathSegments = path.split('/');
+       let currentResource = this.restApi.root;
+
+       for (const segment of pathSegments) {
+           const existingResource = currentResource.getResource(segment);
+           currentResource = existingResource || currentResource.addResource(segment);
+       }

-       resource.addMethod(method, new LambdaIntegration(lambdaFn), {
+       currentResource.addMethod(method, new LambdaIntegration(lambdaFn), {
           authorizationType: AuthorizationType.COGNITO,
           authorizer,
       });
    }
        for (const segment of pathSegments) {
            const existingResource = currentResource.getResource(segment);
            currentResource = existingResource ?? currentResource.addResource(segment);
        }

        currentResource.addMethod(method, new LambdaIntegration(lambdaFn), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        });
    }
}
