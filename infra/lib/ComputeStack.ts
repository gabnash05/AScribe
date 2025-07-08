import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct, Node } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement, Effect, ServicePrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

import { AscribeAppProps } from '../types/ascribe-app-types';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

interface ComputeStackProps extends AscribeAppProps {
    documentBucket: Bucket,
    documentsTable: Table,
    extractedTextsTable: Table,
    summariesTable: Table,
    questionsTable: Table,
    openSearchEndpoint: string;
    bedrockModelID: string;
}

export class ComputeStack extends Stack {
    // Document Handlers
    public readonly processUploadedFileLambda: NodejsFunction;
    public readonly finalizeUploadLambda: NodejsFunction;
    public readonly getDocumentLambda: NodejsFunction;
    public readonly getDocumentsLambda: NodejsFunction;
    public readonly updateDocumentLambda: NodejsFunction;
    public readonly deleteDocumentLambda: NodejsFunction;
    public readonly updateTagsLambda: NodejsFunction;

    // Extracted Text Handlers
    public readonly getExtractedTextLambda: NodejsFunction;
    public readonly updateExtractedTextLambda: NodejsFunction;
    public readonly deleteExtractedTextLambda: NodejsFunction;

    // Summary Handlers
    public readonly createSummaryLambda: NodejsFunction;
    public readonly getSummaryLambda: NodejsFunction;
    public readonly updateSummaryLambda: NodejsFunction;
    public readonly deleteSummaryLambda: NodejsFunction;

    // Questions Handlers
    public readonly createQuestionsLambda: NodejsFunction;
    public readonly getQuestionsLambda: NodejsFunction;
    public readonly getQuestionLambda: NodejsFunction;
    public readonly updateQuestionLambda: NodejsFunction;
    public readonly deleteQuestionLambda: NodejsFunction;

    // Search Handlers
    public readonly searchDocumentsLambda: NodejsFunction;
    public readonly initializeSearchIndexLambda: NodejsFunction;

    // Textract Handlers and Topics
    public readonly handleTextractJobCompletionLambda: NodejsFunction;
    public readonly textractNotificationTopic: Topic;
    public readonly textractServiceRole: Role;

    constructor(scope: Construct, id: string, props: ComputeStackProps) {
        super(scope, id, props);

        const {
            documentBucket,
            documentsTable,
            extractedTextsTable,
            summariesTable,
            questionsTable,
            openSearchEndpoint,
            bedrockModelID
        } = props;

        // 
        // OCR Components
        // 
        this.textractNotificationTopic = new Topic(this, 'TextractNotificationTopic', {
            displayName: 'Textract Job Completion Notifications',
        });

        this.textractServiceRole = new Role(this, 'TextractServiceRole', {
            assumedBy: new ServicePrincipal('textract.amazonaws.com'),
            description: 'Role that Textract uses to access SNS topic',
            roleName: `TextractServiceRole-${props.stage}`,
        });
        
        //
        // ENV VARIABLES
        //

        // Base environment variables common to all Lambdas
        const baseEnv = {
            DOCUMENT_BUCKET: documentBucket.bucketName,
            DOCUMENTS_TABLE: documentsTable.tableName,
            EXTRACTED_TEXTS_TABLE: extractedTextsTable.tableName,
            SUMMARIES_TABLE: summariesTable.tableName,
            QUESTIONS_TABLE: questionsTable.tableName,
        };

        // For Lambdas that interact with OpenSearch
        const lambdaPropsWithSearch = {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            environment: {
                ...baseEnv,
                OPENSEARCH_ENDPOINT: openSearchEndpoint,
            }
        };

        // For Lambdas that interact with Bedrock and OpenSearch
        const lambdaPropsWithBedrockAndSearch = {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            environment: {
                ...baseEnv,
                OPENSEARCH_ENDPOINT: openSearchEndpoint,
                BEDROCK_MODEL_ID: bedrockModelID, 
            }
        };

        // For Lambdas that interact with Bedrock, Textract, and OpenSearch
        const lambdaPropsWithBedrockTextractSearch = {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            environment: {
                ...baseEnv,
                OPENSEARCH_ENDPOINT: openSearchEndpoint,
                TEXTRACT_SNS_TOPIC_ARN: this.textractNotificationTopic.topicArn,
                TEXTRACT_ROLE_ARN: this.textractServiceRole.roleArn,
                BEDROCK_MODEL_ID: bedrockModelID, 
            }
        };

        // For Lambdas that don't interact with OpenSearch or Bedrock
        const lambdaProps = {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(10),
            environment: baseEnv
        };

        // Document Lambda functions
        this.processUploadedFileLambda = this.createLambda('processUploadedFile', 'Documents', lambdaPropsWithBedrockTextractSearch);            this.finalizeUploadLambda = this.createLambda('finalizeUpload', 'Documents', lambdaPropsWithBedrockAndSearch);
        this.getDocumentLambda = this.createLambda('getDocument', 'Documents', lambdaProps);
        this.getDocumentsLambda = this.createLambda('getDocuments', 'Documents', lambdaProps);
        this.updateDocumentLambda = this.createLambda('updateDocument', 'Documents', lambdaProps);
        this.deleteDocumentLambda = this.createLambda('deleteDocument', 'Documents', lambdaProps);
        this.updateTagsLambda = this.createLambda('updateTags', 'Documents', lambdaPropsWithSearch);

        // Extracted Text Lambda functions
        this.getExtractedTextLambda = this.createLambda('getExtractedText', 'ExtractedText', lambdaProps);
        this.updateExtractedTextLambda = this.createLambda('updateExtractedText', 'ExtractedText', lambdaPropsWithSearch);
        this.deleteExtractedTextLambda = this.createLambda('deleteExtractedText', 'ExtractedText', lambdaPropsWithSearch);

        // Summary Lambda functions
        this.createSummaryLambda = this.createLambda('createSummary', 'Summaries', lambdaPropsWithBedrockAndSearch);
        this.getSummaryLambda = this.createLambda('getSummary', 'Summaries', lambdaProps);
        this.updateSummaryLambda = this.createLambda('updateSummary', 'Summaries', lambdaPropsWithSearch);
        this.deleteSummaryLambda = this.createLambda('deleteSummary', 'Summaries', lambdaPropsWithSearch);

        // Questions Lambda functions
        this.createQuestionsLambda = this.createLambda('createQuestions', 'Questions', lambdaPropsWithBedrockAndSearch);
        this.getQuestionsLambda = this.createLambda('getQuestions', 'Questions', lambdaProps);
        this.getQuestionLambda = this.createLambda('getQuestion', 'Questions', lambdaProps);
        this.updateQuestionLambda = this.createLambda('updateQuestion', 'Questions', lambdaPropsWithSearch);
        this.deleteQuestionLambda = this.createLambda('deleteQuestion', 'Questions', lambdaPropsWithSearch);

        // Search Lambda function (must have OpenSearch access)
        this.searchDocumentsLambda = this.createLambda('searchDocuments', 'Search', lambdaPropsWithSearch);
        this.initializeSearchIndexLambda = this.createLambda('initializeSearchIndex', 'Search', lambdaPropsWithSearch);

        // Textract Lambda functions
        this.handleTextractJobCompletionLambda = this.createLambda('handleTextractJobCompletion', 'OCR', lambdaProps);

        // 
        // S3 Permissions
        // 

        // Document Bucket
        documentBucket.grantReadWrite(this.processUploadedFileLambda);
        documentBucket.grantReadWrite(this.finalizeUploadLambda);
        documentBucket.grantRead(this.getDocumentLambda);
        documentBucket.grantRead(this.getDocumentsLambda);
        documentBucket.grantWrite(this.updateDocumentLambda);
        documentBucket.grantWrite(this.deleteDocumentLambda);
        documentBucket.grantReadWrite(this.handleTextractJobCompletionLambda);

        // Lambdas that only read S3 references
        documentBucket.grantRead(this.getExtractedTextLambda);
        documentBucket.grantRead(this.getSummaryLambda);
        documentBucket.grantRead(this.getQuestionsLambda);
        documentBucket.grantRead(this.searchDocumentsLambda);

        // 
        // DynamoDB Permissions
        // 

        // Documents Table
        documentsTable.grantReadWriteData(this.processUploadedFileLambda);
        documentsTable.grantReadWriteData(this.finalizeUploadLambda);
        documentsTable.grantReadData(this.getDocumentLambda);
        documentsTable.grantReadData(this.getDocumentsLambda);
        documentsTable.grantReadWriteData(this.updateDocumentLambda);
        documentsTable.grantReadWriteData(this.deleteDocumentLambda);
        documentsTable.grantReadWriteData(this.updateTagsLambda);
        documentsTable.grantReadWriteData(this.handleTextractJobCompletionLambda);

        // Summaries and Questions may need document metadata read
        documentsTable.grantReadData(this.createSummaryLambda);
        documentsTable.grantReadData(this.createQuestionsLambda);

        // ExtractedTexts Table
        extractedTextsTable.grantReadWriteData(this.getDocumentLambda);
        extractedTextsTable.grantWriteData(this.processUploadedFileLambda);
        extractedTextsTable.grantReadWriteData(this.finalizeUploadLambda);
        extractedTextsTable.grantReadData(this.getExtractedTextLambda);
        extractedTextsTable.grantReadWriteData(this.updateExtractedTextLambda);
        extractedTextsTable.grantReadWriteData(this.deleteExtractedTextLambda);
        extractedTextsTable.grantWriteData(this.handleTextractJobCompletionLambda);

        // Needed for summary/question generation
        extractedTextsTable.grantReadData(this.createSummaryLambda);
        extractedTextsTable.grantReadData(this.createQuestionsLambda);

        // Summaries Table
        summariesTable.grantWriteData(this.createSummaryLambda);
        summariesTable.grantReadData(this.getSummaryLambda);
        summariesTable.grantReadWriteData(this.updateSummaryLambda);
        summariesTable.grantReadWriteData(this.deleteSummaryLambda);

        // Questions Table
        questionsTable.grantWriteData(this.createQuestionsLambda);
        questionsTable.grantReadData(this.getQuestionsLambda);
        questionsTable.grantReadData(this.getQuestionLambda);
        questionsTable.grantReadWriteData(this.updateQuestionLambda);
        questionsTable.grantReadWriteData(this.deleteQuestionLambda);

        //  
        // EventBridge for S3 PutObject
        // 
        new Rule(this, 'TriggerOCROnS3Upload', {
            eventPattern: {
                source: ['aws.s3'],
                detailType: ['Object Created'],
                detail: {
                    bucket: {
                        name: [props.documentBucket.bucketName],
                    },
                    object: {
                        key: [{ prefix: 'temp/' }],
                    }
                }
            },
            targets: [new LambdaFunction(this.processUploadedFileLambda)]
        })

        this.processUploadedFileLambda.addPermission('AllowEventBridgeInvoke', {
            principal: new ServicePrincipal('events.amazonaws.com')
        })
        
        // 
        // Bedrock Permissions
        //
        const bedrockPolicy = new PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: props.stage === 'dev' ? ['*'] : [
                `arn:aws:bedrock:${props.env.region}::foundation-model/${props.bedrockModelID}`
            ]
        });
        this.finalizeUploadLambda.addToRolePolicy(bedrockPolicy);
        this.handleTextractJobCompletionLambda.addToRolePolicy(bedrockPolicy);
        this.createSummaryLambda.addToRolePolicy(bedrockPolicy);
        this.createQuestionsLambda.addToRolePolicy(bedrockPolicy);

        // 
        // OCR Policies
        // 
        this.textractNotificationTopic.addSubscription(
            new LambdaSubscription(this.handleTextractJobCompletionLambda)
        );

        this.textractNotificationTopic.addToResourcePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['sns:Publish'],
                principals: [new ServicePrincipal('textract.amazonaws.com')],
                resources: [this.textractNotificationTopic.topicArn],
            })
        );

        // Allow Textract to publish to the SNS topic
        this.textractNotificationTopic.grantPublish(this.textractServiceRole);
        this.textractServiceRole.addToPolicy(new PolicyStatement({
            actions: ['sns:Publish'],
            resources: [this.textractNotificationTopic.topicArn],
        }));

        this.textractServiceRole.addToPolicy(new PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${documentBucket.bucketArn}/*`],
        }));

        // More Textract Permissions
        this.handleTextractJobCompletionLambda.addToRolePolicy(
            new PolicyStatement({
                actions: ['textract:GetDocumentTextDetection'],
                resources: ['*'], // TODO: Restrict to specific resources in production
            })
        );

        this.processUploadedFileLambda.addToRolePolicy(
            new PolicyStatement({
                actions: [
                    'textract:DetectDocumentText',
                    "textract:StartDocumentTextDetection",
                ],
                resources: ['*'], // TODO: Restrict to specific resources in production
            })
        );
    }

    private createLambda(name: string, handlerType: string, commonProps: Partial<NodejsFunctionProps>): NodejsFunction {
        return new NodejsFunction(this, `${name}Lambda`, {
            entry: path.resolve(__dirname, '..', '..', 'backend', 'src', 'handlers', handlerType, `${name}.ts`),
            ...commonProps
        });
    }
}