import { App, StackProps } from 'aws-cdk-lib';
import { AuthStack } from '../lib/AuthStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { StorageStack } from '../lib/StorageStack';
import { ComputeStack } from '../lib/ComputeStack';
import { SearchStack } from '../lib/SearchStack';
import { APIGatewayStack } from '../lib/APIGatewayStack';
import { MonitoringStack } from '../lib/MonitoringStack';

import { AscribeAppProps } from '../types/ascribe-app-types';

const app = new App();

const stage = process.env.STAGE || 'dev';

const requiredEnvVars = ['CDK_DEFAULT_ACCOUNT', 'CDK_DEFAULT_REGION', 'BEDROCK_MODEL_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const commonProps: AscribeAppProps = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT!,
        region: process.env.CDK_DEFAULT_REGION!,
    },
    stage: stage,
    masterUserName: process.env.MASTER_USER_NAME,
    notificationEmail: process.env.ALARM_NOTIFICATION_EMAIL,
    tags: {
        Application: 'AScribe',
        Environment: stage,
    },
};

// Base infrastructure stacks
const authStack = new AuthStack(app, `AScribeAuthStack-${stage}`, commonProps);
const databaseStack = new DatabaseStack(app, `AScribeDatabaseStack-${stage}`, commonProps);
const storageStack = new StorageStack(app, `AScribeStorageStack-${stage}`, commonProps);

// Search stack (depends on nothing)
const searchStack = new SearchStack(app, `AScribeSearchStack-${stage}`, {
    ...commonProps,
});

// Compute stack (depends on database, storage, and search)
const computeStack = new ComputeStack(app, `AScribeComputeStack-${stage}`, {
    ...commonProps,
    documentBucket: storageStack.documentBucket,
    documentsTable: databaseStack.documentsTable,
    extractedTextsTable: databaseStack.extractedTextsTable,
    summariesTable: databaseStack.summariesTable,
    questionsTable: databaseStack.questionsTable,
    openSearchEndpoint: searchStack.searchDomain.domainEndpoint,
    bedrockModelID: process.env.BEDROCK_MODEL_ID!, // TODO: set this from config
});

// Update search stack with actual Lambda references
searchStack.bindLambdas({
    finalizeUploadLambda: computeStack.finalizeUploadLambda,
    searchLambda: computeStack.searchDocumentsLambda,
    updateExtractedTextLambda: computeStack.updateExtractedTextLambda,
    updateTagsLambda: computeStack.updateTagsLambda,
    deleteExtractedTextLambda: computeStack.deleteExtractedTextLambda,
    updateSummaryLambda: computeStack.updateSummaryLambda,
    deleteSummaryLambda: computeStack.deleteSummaryLambda,
    updateQuestionLambda: computeStack.updateQuestionLambda,
    deleteQuestionLambda: computeStack.deleteQuestionLambda,
    initializeSearchIndexLambda: computeStack.initializeSearchIndexLambda,
});

// API Gateway stack (depends on compute and auth)
const apiGatewayStack = new APIGatewayStack(app, `AScribeApiGatewayStack-${stage}`, {
    ...commonProps,
    userPool: authStack.userPool,
    userPoolClient: authStack.userPoolClient,
    lambdas: {
        uploadLambda: computeStack.uploadLambda,
        finalizeUploadLambda: computeStack.finalizeUploadLambda,
        getDocumentLambda: computeStack.getDocumentLambda,
        getDocumentsLambda: computeStack.getDocumentsLambda,
        updateDocumentLambda: computeStack.updateDocumentLambda,
        deleteDocumentLambda: computeStack.deleteDocumentLambda,
        getExtractedTextLambda: computeStack.getExtractedTextLambda,
        updateExtractedTextLambda: computeStack.updateExtractedTextLambda,
        deleteExtractedTextLambda: computeStack.deleteExtractedTextLambda,
        updateTagsLambda: computeStack.updateTagsLambda,
        createSummaryLambda: computeStack.createSummaryLambda,
        getSummaryLambda: computeStack.getSummaryLambda,
        updateSummaryLambda: computeStack.updateSummaryLambda,
        deleteSummaryLambda: computeStack.deleteSummaryLambda,
        createQuestionsLambda: computeStack.createQuestionsLambda,
        getQuestionsLambda: computeStack.getQuestionsLambda,
        getQuestionLambda: computeStack.getQuestionLambda,
        updateQuestionLambda: computeStack.updateQuestionLambda,
        deleteQuestionLambda: computeStack.deleteQuestionLambda,
        searchDocumentsLambda: computeStack.searchDocumentsLambda,
        initializeSearchIndexLambda: computeStack.initializeSearchIndexLambda,
    }
});

// Monitoring stack (depends on compute and API Gateway)
const criticalLambdas = [
    computeStack.uploadLambda,
    computeStack.finalizeUploadLambda,
    computeStack.getDocumentLambda,
    computeStack.createSummaryLambda,
    computeStack.createQuestionsLambda,
];

const regularLambdas = [
    computeStack.getDocumentsLambda,
    computeStack.updateDocumentLambda,
    computeStack.deleteDocumentLambda,
    computeStack.getExtractedTextLambda,
    computeStack.updateExtractedTextLambda,
    computeStack.deleteExtractedTextLambda,
    computeStack.updateTagsLambda,
    computeStack.getSummaryLambda,
    computeStack.updateSummaryLambda,
    computeStack.deleteSummaryLambda,
    computeStack.getQuestionsLambda,
    computeStack.getQuestionLambda,
    computeStack.updateQuestionLambda,
    computeStack.deleteQuestionLambda,
    computeStack.searchDocumentsLambda,
    computeStack.initializeSearchIndexLambda,
];

new MonitoringStack(app, `AScribeMonitoringStack-${stage}`, {
    ...commonProps,
    criticalLambdas,
    regularLambdas,
    apiGateway: apiGatewayStack.restApi,
});