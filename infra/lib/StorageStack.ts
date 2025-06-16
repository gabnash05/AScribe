import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends Stack {
    public readonly documentBucket: Bucket

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        
        this.documentBucket = new Bucket(this, 'DocumentBucket', {
            bucketName: 'ascribe-document-bucket',
            removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN in production
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT, HttpMethods.DELETE],
                    allowedOrigins: ['*'], // Change to your domain in production
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                    exposedHeaders: ['ETag']
                }
            ]
        });
    }
}