import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { AscribeAppProps } from '../types/ascribe-app-types';

interface DatabaseStackProps extends AscribeAppProps {}

export class DatabaseStack extends Stack {
    public readonly documentsTable: Table;
    public readonly extractedTextsTable: Table;
    public readonly summariesTable: Table;
    public readonly questionsTable: Table;

    constructor(scope: Construct, id: string, props: DatabaseStackProps) {
        super(scope, id, props);

        this.documentsTable = new Table(this, 'DocumentsTable', {
            tableName: `AScribeDocuments-${props.stage}`,
            partitionKey: { name: 'userId', type: AttributeType.STRING },
            sortKey: { name: 'documentId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Add GSI for fetching all file paths by user
        this.documentsTable.addGlobalSecondaryIndex({
            indexName: 'userId-index',
            partitionKey: { name: 'userId', type: AttributeType.STRING },
            projectionType: ProjectionType.INCLUDE,
            nonKeyAttributes: ['filePath']
        });

        // Add GSI for Textract jobId lookup
        this.documentsTable.addGlobalSecondaryIndex({
            indexName: 'textractJob-index',
            partitionKey: { name: 'textractJobId', type: AttributeType.STRING },
            projectionType: ProjectionType.ALL,
        });

        // Attributes (stored in the item as needed)
        // userId: string;
        // documentId: string;
        // fileKey: string;
        // filePath: string; // for FE
        // originalFilename: string;
        // uploadDate: string; // ISO date string
        // contentType: string; // MIME type of the file
        // fileSize: number; // Size of the file in bytes
        // textExtractionMethod: 'sync' | 'async'; // Method used for text extraction
        // status: DocumentStatus;
        // tags: string[];
        // extractedTextId: string;
        // textractJobId?: string;

        this.extractedTextsTable = new Table(this, 'ExtractedTextsTable', {
            tableName: `AScribeExtractedTexts-${props.stage}`,
            partitionKey: { name: 'extractedTextId', type: AttributeType.STRING },  
            sortKey: { name: 'documentId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Attributes:
        // - extractedTextId: string (unique ID for the extracted text)
        // - documentId: string (FK to original doc)
        // - processedDate: string
        // - textFileKey: string (S3 key of saved .md/.txt)
        // - verified: boolean
        // - averageConfidence: number (optional, for confidence score)
        // - summaryId: string (optional)
        // - questionsId: string[] (optional)f
        // - tokens: number (optional, for token count)

        this.summariesTable = new Table (this, 'SummariesTable', {
            tableName: `AScribeSummaries-${props.stage}`,
            partitionKey: { name: 'documentId', type: AttributeType.STRING },
            sortKey: { name: 'summaryId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Attributes:
        // - summaryId: string (Sort Key, unique ID for the summary)
        // - documentId: string (PK)
        // - summaryText: string
        // - createdAt: string

        this.questionsTable = new Table(this, 'QuestionsTable', {
            tableName: `AScribeQuestions-${props.stage}`,
            partitionKey: { name: 'documentId', type: AttributeType.STRING },
            sortKey: { name: 'questionsId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Attributes:
        // - questionsId: string (PK)
        // - documentId: string (Sort Key / FK)
        // - tags: string[] (optional, for categorization)
        // - question: string
        // - choices: string[] (optional, for multiple choice)
        // - answer: string
        // - createdAt: string

    }
}