import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AscribeAppProps } from "../types/ascribe-app-types";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";

interface NotificationStackProps extends AscribeAppProps {
    documentBucket: Bucket;
    processUploadedFileLambda: NodejsFunction;
}

export class NotificationStack extends Stack {
    constructor(scope: Construct, id: string, props: NotificationStackProps) {
        super(scope, id, props);

        const { documentBucket, processUploadedFileLambda } = props;
        
        // Add S3 event notification to trigger Lambda on uploads to 'temp/'
        documentBucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(props.processUploadedFileLambda),
            { prefix: 'temp/' }
        );

        // Grant S3 permission to invoke the Lambda
        processUploadedFileLambda.addPermission('AllowS3Invoke', {
            principal: new ServicePrincipal('s3.amazonaws.com'),
            sourceArn: props.documentBucket.bucketArn,
        });
    }
}  