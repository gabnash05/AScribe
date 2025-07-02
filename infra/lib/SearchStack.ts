import { Stack, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { Effect, PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AscribeAppProps } from '../types/ascribe-app-types';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

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
    public readonly domainName: string;
    public readonly domainEndpoint: string;

    constructor(scope: Construct, id: string, props: SearchStackProps) {
        super(scope, id, props);

        this.domainName = `ascribe-search-${props.stage}`;

        const domain = new Domain(this, 'AscribeSearchDomain', {
            domainName: this.domainName,
            version: EngineVersion.OPENSEARCH_2_5,
            removalPolicy: props.stage === 'dev'? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: DESTROY for dev, RETAIN for prod
            capacity: {
                dataNodes: 1,
                dataNodeInstanceType: 't3.small.search',
                multiAzWithStandbyEnabled: false,
            },
            ebs: {
                volumeSize: 10,
                volumeType: EbsDeviceVolumeType.GP2,
            },
            zoneAwareness: {
                enabled: false,
            },
            enforceHttps: true,
            nodeToNodeEncryption: true,
            encryptionAtRest: {
                enabled: true,
            },
            accessPolicies: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    principals: [new AnyPrincipal()],
                    actions: ['es:*'],
                    resources: [`arn:aws:es:${this.region}:${this.account}:domain/${this.domainName}/*`],
                }),
            ],
        });

        this.domainEndpoint = domain.domainEndpoint;

        new CfnOutput(this, 'OpenSearchEndpoint', {
            value: this.domainEndpoint,
            exportName: 'OpenSearchEndpoint',
        });

        // Bind Lambdas if provided
        if (props.searchLambdas) {
            this.bindLambdas(props.searchLambdas);
        }
    }

    public bindLambdas(lambdas: SearchLambdas): void {
        const domainArn = `arn:aws:es:${this.region}:${this.account}:domain/${this.domainName}`;

        // Base policy for all Lambdas
        const basePolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'es:ESHttpDelete',
                'es:ESHttpGet',
                'es:ESHttpHead',
                'es:ESHttpPost',
                'es:ESHttpPut',
            ],
            resources: [`${domainArn}/*`],
        });

        // Apply policies to all Lambdas
        Object.values(lambdas).forEach(lambda => {
            lambda.addToRolePolicy(basePolicy);
        });

        // Additional permissions for specific operations
        const indexManagementPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'es:CreateIndex',
                'es:DeleteIndex',
                'es:UpdateIndex',
                'es:DescribeIndex',
            ],
            resources: [`${domainArn}/*`],
        });

        // Apply specific policies
        lambdas.finalizeUploadLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.updateExtractedTextLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.updateTagsLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.updateSummaryLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.updateQuestionLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.deleteExtractedTextLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.deleteSummaryLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.deleteQuestionLambda.addToRolePolicy(indexManagementPolicy);
        lambdas.initializeSearchIndexLambda.addToRolePolicy(indexManagementPolicy);
    }
}