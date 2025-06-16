import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

interface ComputeStackProps extends StackProps {
    documentBucket: Bucket,
    documentsTable: Table,
    extractedTextsTable: Table,
    summariesTable: Table,
    questionsTable: Table,
}

export class ComputeStack extends Stack {
    // Document Handlers
    public readonly uploadLambda: NodejsFunction;
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


    constructor(scope: Construct, id: string, props: ComputeStackProps) {
        super(scope, id, props);

        const {
            documentBucket,
            documentsTable,
            extractedTextsTable,
            summariesTable,
            questionsTable
        } = props;

        const lambdaProps = {
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            environment: {
                DOCUMENT_BUCKET: documentBucket.bucketName,
                DOCUMENTS_TABLE: documentsTable.tableName,
                EXTRACTED_TEXTS_TABLE: extractedTextsTable.tableName,
                SUMMARIES_TABLE: summariesTable.tableName,
                QUESTIONS_TABLE: questionsTable.tableName,
            }
        };

        // Document Lambda functions
        this.uploadLambda = this.createLambda('upload', 'Documents', lambdaProps);
        this.finalizeUploadLambda = this.createLambda('finalizeUpload', 'Documents', lambdaProps);
        this.getDocumentLambda = this.createLambda('getDocument', 'Documents', lambdaProps);
        this.getDocumentsLambda = this.createLambda('getDocuments', 'Documents', lambdaProps);
        this.updateDocumentLambda = this.createLambda('updateDocument', 'Documents', lambdaProps);
        this.deleteDocumentLambda = this.createLambda('deleteDocument', 'Documents', lambdaProps);
        this.updateTagsLambda = this.createLambda('updateTags', 'Documents', lambdaProps);

        // Extracted Text Lambda functions
        this.getExtractedTextLambda = this.createLambda('getExtractedText', 'ExtractedText', lambdaProps);
        this.updateExtractedTextLambda = this.createLambda('updateExtractedText', 'ExtractedText', lambdaProps);
        this.deleteExtractedTextLambda = this.createLambda('deleteExtractedText', 'ExtractedText', lambdaProps);

        // Summary Lambda functions
        this.createSummaryLambda = this.createLambda('createSummary', 'Summaries', lambdaProps);
        this.getSummaryLambda = this.createLambda('getSummary', 'Summaries', lambdaProps);
        this.updateSummaryLambda = this.createLambda('updateSummary', 'Summaries', lambdaProps);
        this.deleteSummaryLambda = this.createLambda('deleteSummary', 'Summaries', lambdaProps);

        // Questions Lambda functions
        this.createQuestionsLambda = this.createLambda('createQuestions', 'Questions', lambdaProps);
        this.getQuestionsLambda = this.createLambda('getQuestions', 'Questions', lambdaProps);
        this.getQuestionLambda = this.createLambda('getQuestion', 'Questions', lambdaProps);
        this.updateQuestionLambda = this.createLambda('updateQuestion', 'Questions', lambdaProps);
        this.deleteQuestionLambda = this.createLambda('deleteQuestion', 'Questions', lambdaProps);

        // Grant S3 permissions (adjust as needed)
        documentBucket.grantReadWrite(this.uploadLambda);
        documentBucket.grantReadWrite(this.finalizeUploadLambda);
        documentBucket.grantRead(this.getDocumentLambda);
        documentBucket.grantWrite(this.updateDocumentLambda);

        // Grant DynamoDB permissions for Documents Table
        documentsTable.grantReadWriteData(this.uploadLambda);
        documentsTable.grantReadWriteData(this.finalizeUploadLambda);
        documentsTable.grantReadData(this.getDocumentLambda);
        documentsTable.grantReadData(this.getDocumentsLambda);
        documentsTable.grantReadWriteData(this.updateDocumentLambda);
        documentsTable.grantReadWriteData(this.deleteDocumentLambda);
        documentsTable.grantReadWriteData(this.updateTagsLambda);
        documentsTable.grantReadData(this.createSummaryLambda);
        documentsTable.grantReadData(this.createQuestionsLambda);

        // Grant DynamoDB permissions for ExtractedTexts Table
        extractedTextsTable.grantWriteData(this.finalizeUploadLambda);
        extractedTextsTable.grantReadData(this.getExtractedTextLambda);
        extractedTextsTable.grantReadWriteData(this.updateExtractedTextLambda);
        extractedTextsTable.grantReadWriteData(this.deleteExtractedTextLambda);
        extractedTextsTable.grantReadData(this.createSummaryLambda);
        extractedTextsTable.grantReadData(this.createQuestionsLambda);

        // Grant DynamoDB permissions for Summaries Table
        summariesTable.grantWriteData(this.createSummaryLambda);
        summariesTable.grantReadData(this.getSummaryLambda);
        summariesTable.grantReadWriteData(this.updateSummaryLambda);
        summariesTable.grantReadWriteData(this.deleteSummaryLambda);

        // Grant DynamoDB permissions for Questions Table
        questionsTable.grantWriteData(this.createQuestionsLambda);
        questionsTable.grantReadData(this.getQuestionsLambda);
        questionsTable.grantReadData(this.getQuestionLambda);
        questionsTable.grantReadWriteData(this.updateQuestionLambda);
        questionsTable.grantReadWriteData(this.deleteQuestionLambda);
    }

    private createLambda(name: string, handlerType: string, commonProps: any): NodejsFunction {
        return new NodejsFunction(this, `${name}Lambda`, {
            entry: path.join(__dirname, `../../backend/src/handlers/${handlerType}/${name}.ts`),
            ...commonProps
        });
    }
}