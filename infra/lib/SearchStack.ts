import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration, CfnCustomResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

interface SearchStackProps extends StackProps {
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

export class SearchStack extends Stack {
    public readonly searchDomain: Domain;

    constructor(scope: Construct, id: string, props: SearchStackProps) {
        super(scope, id, props);

        // Create OpenSearch domain
        this.searchDomain = new Domain(this, 'AScribeSearchDomain', {
            version: EngineVersion.OPENSEARCH_2_9,
            domainName: 'ascribe-search',
            capacity: {
                dataNodes: 1,
                dataNodeInstanceType: 't3.small.search', // Small instance for development
            },
            ebs: {
                volumeSize: 5,
                volumeType: EbsDeviceVolumeType.GP2,
            },
            zoneAwareness: {
                enabled: false, // Enable in production for HA
            },
            removalPolicy: RemovalPolicy.DESTROY, // TODO: Change to RETAIN in production
            enforceHttps: true,
            nodeToNodeEncryption: true,
            encryptionAtRest: {
                enabled: true,
            },
            fineGrainedAccessControl: {
                masterUserName: 'admin',
            },
        });

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
        props.finalizeUploadLambda.addToRolePolicy(allowPostPut);
        props.updateExtractedTextLambda.addToRolePolicy(allowPostPut);
        props.updateTagsLambda.addToRolePolicy(allowPostPut);
        props.updateSummaryLambda.addToRolePolicy(allowPostPut);
        props.updateQuestionLambda.addToRolePolicy(allowPostPut);

        // Grant search perms
        props.searchLambda.addToRolePolicy(allowGetSearch);
        props.initializeSearchIndexLambda.addToRolePolicy(allowInitialize);

        // Grant delete perms
        props.deleteExtractedTextLambda.addToRolePolicy(allowDelete);
        props.deleteSummaryLambda.addToRolePolicy(allowDelete);
        props.deleteQuestionLambda.addToRolePolicy(allowDelete);

        new CfnOutput(this, 'OpenSearchEndpoint', {
            value: this.searchDomain.domainEndpoint,
            exportName: 'OpenSearchEndpoint',
        });

        new CfnCustomResource(this, 'InitSearchIndex', {
            serviceToken: props.initializeSearchIndexLambda.functionArn,
        });
    }
}