#!/usr/bin/env node
import {App, StackProps} from 'aws-cdk-lib';
import { AuthStack } from '../lib/AuthStack';
import { APIGatewayStack } from '../lib/APIGatewayStack';

const app = new App();

const env: StackProps = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
}

const authStack = new AuthStack(app, 'AuthStack', env);

// new APIGatewayStack(app, 'StudentDocAPIGatewayStack', {
//     ...env,
//     userPool: authStack.userPool,
//     userPoolClient: authStack.userPoolClient,
//     uploadLambda: lambdaStack.uploadLambda,
//     finalizeLambda: lambdaStack.finalizeLambda,
//     summarizeLambda: lambdaStack.summarizeLambda,
//     searchLambda: lambdaStack.searchLambda,
//     getLambda: lambdaStack.getLambda,
//     deleteLambda: lambdaStack.deleteLambda,
//     updateLambda: lambdaStack.updateLambda,
// });