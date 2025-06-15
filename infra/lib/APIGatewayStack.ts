import { Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpApiProps, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
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
    // Add other Lambda functions as needed
}

export class APIGatewayStack extends Stack {
    public readonly httpApi: HttpApi;

    constructor(scope: Construct, id: string, props: APIGatewayStackProps) {
        super(scope, id, props);

        const { 
            userPool, 
            userPoolClient, 
            uploadLambda, 
            finalizeUploadLambda, 
            searchLambda, 
            getDocumentLambda, 
            deleteDocumentLambda, 
            updateDocumentLambda, 
            summarizeLambda,
            generateFlashCardsLambda,
            generateQuizLambda,
        } = props;

        const authorizer = this.createUserPoolAuthorizer(userPool, userPoolClient);

        this.httpApi = new HttpApi(this, 'StudentDocHttpApi', {
            description: 'HTTP API for student OCR app',
            corsPreflight: {
                allowHeaders: ['Authorization', 'Content-Type'],
                allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.GET],
                allowOrigins: ['*'], // change to your domain in prod
            },
        });

        this.addRoute('/upload', HttpMethod.POST, uploadLambda, authorizer);
        this.addRoute('/finalizeUpload', HttpMethod.POST, finalizeUploadLambda, authorizer);
        this.addRoute('/summarize', HttpMethod.GET, summarizeLambda, authorizer);
        this.addRoute('/search', HttpMethod.GET, searchLambda, authorizer);
        this.addRoute('/get', HttpMethod.GET, getDocumentLambda, authorizer);
        this.addRoute('/delete', HttpMethod.DELETE, deleteDocumentLambda, authorizer);
        this.addRoute('/update', HttpMethod.PUT, updateDocumentLambda, authorizer);
        this.addRoute('/generateFlashCards', HttpMethod.POST, generateFlashCardsLambda, authorizer);
        this.addRoute('/generateQuiz', HttpMethod.POST, generateQuizLambda, authorizer);
        // Add other routes as needed
    }

    private createUserPoolAuthorizer(userPool: UserPool, userPoolClient: UserPoolClient): HttpUserPoolAuthorizer {
        return new HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
            userPoolClients: [userPoolClient],
        });
    }

    private addRoute(path: string, method: HttpMethod, handler: IFunction, authorizer: HttpUserPoolAuthorizer): void {
        const integration = new HttpLambdaIntegration(`${path}Integration`, handler);
        this.httpApi.addRoutes({
            path,
            methods: [method],
            integration,
            authorizer,
        });
    }
}
