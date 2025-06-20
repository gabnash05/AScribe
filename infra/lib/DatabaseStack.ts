import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
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
            tableName: 'AScribeDocuments',
            partitionKey: { name: 'userId', type: AttributeType.STRING },
            sortKey: { name: 'documentId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Attributes (stored in the item as needed)
        // - userId: string
        // - documentId: string (unique ID for the document)
        // - fileKey: string (S3 key)
        // - originalFilename: string
        // - uploadDate: string (ISO)
        // - status: 'temp' | 'verified'
        // - tags: string[]
        // - extractedTextId: string (FK to extractedTextsTable)

        this.extractedTextsTable = new Table(this, 'ExtractedTextsTable', {
            tableName: 'AScribeExtractedTexts',
            partitionKey: { name: 'extractedTextId', type: AttributeType.STRING },
            sortKey: { name: 'documentId', type: AttributeType.STRING },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        // Attributes:
        // - extractedTextId: string (unique ID for the extracted text)
        // - documentId: string (FK to original doc)
        // - processedDate: string
        // - verified: boolean
        // - textFileKey: string (S3 key of saved .md/.txt)
        // - summaryId: string (optional)
        // - questionsId: string[] (optional)
        // - tokens: number (optional, for token count)

        this.summariesTable = new Table (this, 'SummariesTable', {
            tableName: 'AScribeSummaries',
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
            tableName: 'AScribeQuestions',
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