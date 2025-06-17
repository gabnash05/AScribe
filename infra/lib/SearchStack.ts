import { Stack, StackProps, RemovalPolicy, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

interface SearchStackProps extends StackProps {
  finalizeUploadLambda: IFunction;
  searchLambda: IFunction;
}

export class SearchStack extends Stack {
  public readonly searchDomain: Domain;

  constructor(scope: Construct, id: string, props: SearchStackProps) {
    super(scope, id, props);

    // IAM role for Lambda functions to access OpenSearch
    const osAccessRole = new Role(this, 'OpenSearchAccessRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    // Create OpenSearch domain
    this.searchDomain = new Domain(this, 'AScribeSearchDomain', {
      version: EngineVersion.OPENSEARCH_2_9,
      domainName: 'ascribe-search',
      capacity: {
        masterNodes: props.env?.region === 'us-east-1' ? 3 : 1, // 3 masters required in us-east-1
        dataNodes: 1,
        dataNodeInstanceType: 't3.small.search', // Small instance for development
      },
      ebs: {
        volumeSize: 10,
        volumeType: EbsDeviceVolumeType.GP2,
      },
      zoneAwareness: {
        enabled: false, // Enable in production for HA
      },
      removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN in production
      enforceHttps: true,
      nodeToNodeEncryption: true,
      encryptionAtRest: {
        enabled: true,
      },
      fineGrainedAccessControl: {
        masterUserName: 'admin',
      },
    });

    // Grant permissions to Lambda functions
    this.searchDomain.addAccessPolicies(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('lambda.amazonaws.com')],
        actions: ['es:*'],
        resources: [`${this.searchDomain.domainArn}/*`],
      })
    );

    // Grant specific permissions to our Lambdas
    props.finalizeUploadLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['es:ESHttpPost', 'es:ESHttpPut'],
        resources: [`${this.searchDomain.domainArn}/documents/_doc`],
      })
    );

    props.searchLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['es:ESHttpGet', 'es:ESHttpPost'],
        resources: [`${this.searchDomain.domainArn}/documents/_search`],
      })
    );

    // Output the OpenSearch endpoint
    new CfnOutput(this, 'OpenSearchEndpoint', {
      value: this.searchDomain.domainEndpoint,
      exportName: 'OpenSearchEndpoint',
    });
  }
}

// TODO:: 
// - Add more fine-grained access control and security measures for production
// - Consider using Cognito for authentication
// - Add Summary and Question indexing
// - Update ComputeStack lambdaProps to include OpenSearch domain endpoint
// - Create an initial index mapping
// - Figure out how to handle document, summary, and question updates and deletions in OpenSearch