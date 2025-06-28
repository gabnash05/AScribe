import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { CfnSecurityPolicy, CfnAccessPolicy, CfnCollection } from 'aws-cdk-lib/aws-opensearchserverless';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { AscribeAppProps } from '../types/ascribe-app-types';

export interface SearchLambdas {
    finalizeUploadLambda: IFunction;
    searchLambda: IFunction;
    updateExtractedTextLambda: IFunction;
    updateTagsLambda: IFunction;
    deleteExtractedTextLambda: IFunction;
    updateSummaryLambda: IFunction;
    deleteSummaryLambda: IFunction;
    updateQuestionLambda: IFunction;
    deleteQuestionLambda: IFunction;
    initializeSearchIndexLambda: IFunction;
}

interface SearchStackProps extends AscribeAppProps {
    searchLambdas?: SearchLambdas;
}

export class SearchStack extends Stack {
    public readonly collectionName: string;
    public readonly collectionEndpoint: string;
    private collectionArn?: string;
    private searchLambdas?: SearchLambdas;

    constructor(scope: Construct, id: string, props: SearchStackProps) {
        super(scope, id, props);

        this.collectionName = `ascribe-search-${props.stage}`;

        // 1. Create Encryption Policy
        const encryptionPolicy = new CfnSecurityPolicy(this, 'EncryptionPolicy', {
            name: `${this.collectionName}-encryption`,
            type: 'encryption',
            policy: JSON.stringify({
                Rules: [{
                    Resource: [`collection/${this.collectionName}`],
                    ResourceType: 'collection'
                }],
                AWSOwnedKey: true
            })
        });

        // 2. Create Network Policy
        const networkPolicy = new CfnSecurityPolicy(this, 'NetworkPolicy', {
            name: `${this.collectionName}-network`,
            type: 'network',
            policy: JSON.stringify([{
                Rules: [{
                    Resource: [`collection/${this.collectionName}`],
                    ResourceType: 'collection'
                }],
                AllowFromPublic: true
            }])
        });

        // 3. Create Access Policy
        const accessPolicy = new CfnAccessPolicy(this, 'AccessPolicy', {
            name: `${this.collectionName}-access`,
            type: 'data',
            policy: JSON.stringify([{
                Rules: [{
                    Resource: [`index/${this.collectionName}/*`],
                    ResourceType: 'index',
                    Permission: [
                        'aoss:CreateIndex',
                        'aoss:DeleteIndex',
                        'aoss:UpdateIndex',
                        'aoss:DescribeIndex',
                        'aoss:ReadDocument',
                        'aoss:WriteDocument'
                    ]
                }],
                Principal: [
                    `arn:aws:iam::${this.account}:root`
                ]
            }])
        });

        // 4. Create Collection
        const collection = new CfnCollection(this, 'AScribeSearchCollection', {
            name: this.collectionName,
            type: 'SEARCH',
            description: 'AScribe document search collection',
        });

        collection.applyRemovalPolicy(RemovalPolicy.DESTROY); // TODO: Change to RETAIN in production
        this.collectionArn = collection.attrArn;

        // Add dependencies
        collection.addDependency(encryptionPolicy);
        collection.addDependency(networkPolicy);
        collection.addDependency(accessPolicy);

        this.collectionEndpoint = `https://${collection.attrId}.${this.region}.aoss.amazonaws.com`;

        new CfnOutput(this, 'OpenSearchEndpoint', {
            value: this.collectionEndpoint,
            exportName: 'OpenSearchEndpoint',
        });
    }

    public bindLambdas(lambdas: SearchLambdas): void {
        if (!this.collectionArn) {
            throw new Error('Collection ARN is not available. Make sure the collection is initialized before binding lambdas.');
        }

        this.searchLambdas = lambdas;

        const documentResource = `${this.collectionArn}/index/content/_doc/*`;
        const searchResource = `${this.collectionArn}/index/content/_search`;
        const initializeIndex = `${this.collectionArn}/index/content/*`;

        // Base policy for all Lambdas
        const basePolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['aoss:APIAccessAll'],
            resources: [this.collectionArn!]
        });

        // Specific operation policies
        const allowPostPut = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'aoss:CreateIndex',
                'aoss:UpdateIndex',
                'aoss:WriteDocument'
            ],
            resources: [documentResource],
        });

        const allowGetSearch = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'aoss:ReadDocument',
                'aoss:DescribeIndex'
            ],
            resources: [searchResource],
        });

        const allowDelete = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['aoss:DeleteIndex'],
            resources: [documentResource],
        });

        const allowInitialize = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'aoss:CreateIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex'
            ],
            resources: [initializeIndex],
        });

        // Apply policies to all Lambdas
        Object.values(lambdas).forEach(lambda => {
            lambda.addToRolePolicy(basePolicy);
        });

        // Apply specific policies
        lambdas.finalizeUploadLambda.addToRolePolicy(allowPostPut);
        lambdas.updateExtractedTextLambda.addToRolePolicy(allowPostPut);
        lambdas.updateTagsLambda.addToRolePolicy(allowPostPut);
        lambdas.updateSummaryLambda.addToRolePolicy(allowPostPut);
        lambdas.updateQuestionLambda.addToRolePolicy(allowPostPut);
        lambdas.searchLambda.addToRolePolicy(allowGetSearch);
        lambdas.initializeSearchIndexLambda.addToRolePolicy(allowInitialize);
        lambdas.deleteExtractedTextLambda.addToRolePolicy(allowDelete);
        lambdas.deleteSummaryLambda.addToRolePolicy(allowDelete);
        lambdas.deleteQuestionLambda.addToRolePolicy(allowDelete);
    }
}