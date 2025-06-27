import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, EventType, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

import { AscribeAppProps } from '../types/ascribe-app-types';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface StorageStackProps extends AscribeAppProps {}

export class StorageStack extends Stack {
    public readonly documentBucket: Bucket;
    public readonly documentBucketName: string;

    constructor(scope: Construct, id: string, props: StorageStackProps) {
        super(scope, id, props);

        this.documentBucketName = `ascribe-document-bucket-${props.stage}`;
        
        this.documentBucket = new Bucket(this, 'DocumentBucket', {
            bucketName: this.documentBucketName,
            removalPolicy: props.stage === 'dev' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN, // TODO: Change to RETAIN in production
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT, HttpMethods.DELETE],
                    allowedOrigins: props.stage === 'dev' ? ['*'] : ['https://example.com'], // TODO: Change to your domain in production
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                    exposedHeaders: ['ETag']
                }
            ]
        });
    }

    public addUploadLambdaTrigger(uploadLambda: NodejsFunction) {
        this.documentBucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(uploadLambda),
            { prefix: 'temp/' }
        );

        uploadLambda.addPermission('AllowS3Invoke', {
            principal: new ServicePrincipal('s3.amazonaws.com'),
            sourceArn: this.documentBucket.bucketArn,
        });
    }
}