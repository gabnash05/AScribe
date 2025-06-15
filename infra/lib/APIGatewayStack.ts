import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RestApi, LambdaIntegration, CognitoUserPoolsAuthorizer, Cors, AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

interface APIGatewayStackProps extends StackProps {
    userPool: UserPool;
    userPoolClient: UserPoolClient;
    uploadLambda: IFunction;
    finalizeUploadLambda: IFunction;
    searchLambda: IFunction;
    getDocumentLambda: IFunction;
    deleteDocumentLambda: IFunction;
    updateDocumentLambda: IFunction;
    summarizeLambda: IFunction;
    generateFlashCardsLambda: IFunction;
    generateQuizLambda: IFunction;
}

export class APIGatewayStack extends Stack {
    public readonly restApi: RestApi;

    constructor(scope: Construct, id: string, props: APIGatewayStackProps) {
        super(scope, id, props);

        const {
            userPool,
            uploadLambda,
            finalizeUploadLambda,
            searchLambda,
            getDocumentLambda,
            deleteDocumentLambda,
            updateDocumentLambda,
            summarizeLambda,
            generateFlashCardsLambda,
            generateQuizLambda
        } = props;

        this.restApi = new RestApi(this, 'AScribeRestApi', {
            description: 'AScribe REST API',
            defaultCorsPreflightOptions: {
                allowHeaders: ['Authorization', 'Content-Type'],
                allowMethods: Cors.ALL_METHODS,
                allowOrigins: Cors.ALL_ORIGINS, // restrict in production
            },
        });

        const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
        });

        this.addLambdaRoute('upload', 'POST', uploadLambda, authorizer);
        this.addLambdaRoute('finalizeUpload', 'POST', finalizeUploadLambda, authorizer);
        this.addLambdaRoute('search', 'GET', searchLambda, authorizer);
        this.addLambdaRoute('get', 'GET', getDocumentLambda, authorizer);
        this.addLambdaRoute('delete', 'DELETE', deleteDocumentLambda, authorizer);
        this.addLambdaRoute('update', 'PUT', updateDocumentLambda, authorizer);
        this.addLambdaRoute('summarize', 'GET', summarizeLambda, authorizer);
        this.addLambdaRoute('generateFlashCards', 'POST', generateFlashCardsLambda, authorizer);
        this.addLambdaRoute('generateQuiz', 'POST', generateQuizLambda, authorizer);
    }

    private addLambdaRoute(
        path: string,
        method: string,
        lambdaFn: IFunction,
        authorizer: CognitoUserPoolsAuthorizer
    ): void {
        const resource = this.restApi.root.addResource(path);
        resource.addMethod(method, new LambdaIntegration(lambdaFn), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer,
        });
    }
}
