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
    public readonly uploadLambda: NodejsFunction;
    public readonly finalizeUploadLambda: NodejsFunction;
    public readonly getDocumentLambda: NodejsFunction;
    public readonly updateDocumentLambda: NodejsFunction;
    public readonly deleteDocumentLambda: NodejsFunction;
    public readonly summarizeLambda: NodejsFunction;
    public readonly generateFlashCardsLambda: NodejsFunction;
    public readonly generateQuizLambda: NodejsFunction;

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
            timeout: Duration.seconds(10),
            environment: {
                DOCUMENT_BUCKET: documentBucket.bucketName,
                DOCUMENTS_TABLE: documentsTable.tableName,
                EXTRACTED_TEXTS_TABLE: extractedTextsTable.tableName,
                SUMMARIES_TABLE: summariesTable.tableName,
                QUESTIONS_TABLE: questionsTable.tableName,
            }
        };

        // Define Lambda functions
        this.uploadLambda = this.createLambda('upload', lambdaProps);
        this.finalizeUploadLambda = this.createLambda('finalizeUpload', lambdaProps);
        this.getDocumentLambda = this.createLambda('getDocument', lambdaProps);
        this.updateDocumentLambda = this.createLambda('updateDocument', lambdaProps);
        this.deleteDocumentLambda = this.createLambda('deleteDocument', lambdaProps);
        this.summarizeLambda = this.createLambda('summarize', lambdaProps);
        this.generateFlashCardsLambda = this.createLambda('generateFlashCards', lambdaProps);
        this.generateQuizLambda = this.createLambda('generateQuiz', lambdaProps);

        // Grant access to S3
        documentBucket.grantReadWrite(this.uploadLambda);
        documentBucket.grantReadWrite(this.finalizeUploadLambda);
        documentBucket.grantReadWrite(this.getDocumentLambda);
        documentBucket.grantReadWrite(this.updateDocumentLambda);

        // Grant access to DynamoDB tables
        for (const fn of [
            this.uploadLambda,
            this.finalizeUploadLambda,
            this.getDocumentLambda,
            this.updateDocumentLambda,
            this.deleteDocumentLambda,
            this.summarizeLambda,
            this.generateFlashCardsLambda,
            this.generateQuizLambda
        ]) {
            documentsTable.grantFullAccess(fn);
            extractedTextsTable.grantFullAccess(fn);
            summariesTable.grantFullAccess(fn);
            questionsTable.grantFullAccess(fn);
        }
    }

    private createLambda(name: string, commonProps: any): NodejsFunction {
        return new NodejsFunction(this, `${name}Lambda`, {
            entry: path.join(__dirname, `../../backend/src/handlers/${name}.ts`),
            ...commonProps
        });
    }
}