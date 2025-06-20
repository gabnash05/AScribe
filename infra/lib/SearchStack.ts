import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration, CfnCustomResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

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
    public readonly searchDomain: Domain;
    private searchLambdas?: SearchLambdas;

    constructor(scope: Construct, id: string, props: SearchStackProps) {
        super(scope, id, props);

        // Create OpenSearch domain
        this.searchDomain = new Domain(this, 'AScribeSearchDomain', {
            version: EngineVersion.OPENSEARCH_2_9,
            domainName: 'ascribe-search',
            capacity: {
                dataNodes: 1,
                dataNodeInstanceType: 't3.small.search', // TODO: Small instance for development
            },
            ebs: {
                volumeSize: 5,
                volumeType: EbsDeviceVolumeType.GP2,
            },
            zoneAwareness: {
                enabled: false, // TODO: Enable in production for HA
            },
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            enforceHttps: true,
            nodeToNodeEncryption: true,
            encryptionAtRest: {
                enabled: true,
            },
            fineGrainedAccessControl: {
                masterUserName: 'admin',
            },
        });

        new CfnOutput(this, 'OpenSearchEndpoint', {
            value: this.searchDomain.domainEndpoint,
            exportName: 'OpenSearchEndpoint',
        });

        // Optionally bind lambdas at construction
        if (props.searchLambdas) {
            this.bindLambdas(props.searchLambdas);
        }
    }

    public bindLambdas(lambdas: SearchLambdas): void {
        this.searchLambdas = lambdas;

        const documentResource = `${this.searchDomain.domainArn}/content/_doc/*`;
        const searchResource = `${this.searchDomain.domainArn}/content/_search`;
        const initializeIndex = `${this.searchDomain.domainArn}/content/*`;

        const allowPostPut = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['es:ESHttpPost', 'es:ESHttpPut'],
            resources: [documentResource],
        });

        const allowGetSearch = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['es:ESHttpGet', 'es:ESHttpPost'],
            resources: [searchResource],
        });

        const allowDelete = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['es:ESHttpDelete'],
            resources: [documentResource],
        });

        const allowInitialize = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['es:ESHttpPut', 'es:ESHttpPost', 'es:ESHttpGet'],
            resources: [initializeIndex],
        });

        // Grant indexing perms
        lambdas.finalizeUploadLambda.addToRolePolicy(allowPostPut);
        lambdas.updateExtractedTextLambda.addToRolePolicy(allowPostPut);
        lambdas.updateTagsLambda.addToRolePolicy(allowPostPut);
        lambdas.updateSummaryLambda.addToRolePolicy(allowPostPut);
        lambdas.updateQuestionLambda.addToRolePolicy(allowPostPut);

        // Grant search perms
        lambdas.searchLambda.addToRolePolicy(allowGetSearch);
        lambdas.initializeSearchIndexLambda.addToRolePolicy(allowInitialize);

        // Grant delete perms
        lambdas.deleteExtractedTextLambda.addToRolePolicy(allowDelete);
        lambdas.deleteSummaryLambda.addToRolePolicy(allowDelete);
        lambdas.deleteQuestionLambda.addToRolePolicy(allowDelete);

        new CfnCustomResource(this, 'InitSearchIndex', {
            serviceToken: lambdas.initializeSearchIndexLambda.functionArn,
        });
    }
}