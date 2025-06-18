// Will contain CloudFront distribution and other resources in the future
// - Monitor Costs
// - Add API Gateway Usage Plans to prevent abuse

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import { IDomain } from 'aws-cdk-lib/aws-opensearchservice';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

interface MonitoringStackProps extends StackProps {
    documentsTable: Table,
    documentBucket: Bucket,
    extractedTextsTable: Table,
    summariesTable: Table,
    questionsTable: Table,
    openSearchEndpoint: IDomain;
    lambdas: Function[];
    apiGateway: RestApi;
    userPool: UserPool;
    envName: string;
}

export class MonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const { openSearchEndpoint, lambdas } = props;
        
        // Notification Topic for Alarms
        const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
            displayName: `AScribe Alarms`,
        });
        alarmTopic.addSubscription(new subscriptions.EmailSubscription('nasayaokim@gmail.com'));

        // 
        // OpenSearch Monitoring
        //

        // Cluster Health
        new cw.Alarm(this, 'OpenSearchClusterStatus', {
            metric: openSearchEndpoint.metricClusterStatusRed(),
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cw.TreatMissingData.BREACHING,
            alarmDescription: 'Ascribe OpenSearch Cluster Status',
            alarmName: 'Ascribe-OS-ClusterStatus',
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            actionsEnabled: true,
        }).addAlarmAction(new actions.SnsAction(alarmTopic));
        
        // JVM Memory Pressure
        new cw.Alarm(this, 'OpenSearchJVMHeapPressure', {
            metric: openSearchEndpoint.metricJVMMemoryPressure(),
            threshold: 80,
            evaluationPeriods: 3,
            datapointsToAlarm: 2,
            treatMissingData: cw.TreatMissingData.BREACHING,
            alarmDescription: 'OpenSearch JVM memory pressure > 80%',
            alarmName: 'Ascribe-OS-JVMHeapPressure',
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
            actionsEnabled: true,
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        // CPU Utilization
        new cw.Alarm(this, 'OS-CPUUtilization', {
            metric: openSearchEndpoint.metricCPUUtilization(),
            threshold: 75,
            evaluationPeriods: 5,
            datapointsToAlarm: 3,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
            alarmDescription: 'OpenSearch CPU > 75% for 15 minutes',
            alarmName: 'Ascribe-OS-CPUUtilization',
            actionsEnabled: true
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        //
        // Lambda Monitoring
        //

        // Error Alarm
        lambdas.forEach(lambda => {
            new cw.Alarm(this, `Lambda-${lambda.node.id}-Errors`, {
                metric: lambda.metricErrors(),
                threshold: 1,
                evaluationPeriods: 5,
                datapointsToAlarm: 3,
                treatMissingData: cw.TreatMissingData.NOT_BREACHING,
                alarmDescription: `${lambda.functionName} has errors`,
                alarmName: `Ascribe-Lambda-${lambda.functionName}-Errors`,
                actionsEnabled: true
            }).addAlarmAction(new actions.SnsAction(alarmTopic));
            
            // Duration Alarm
            new cw.Alarm(this, `Lambda-${lambda.node.id}-Duration`, {
                metric: lambda.metricDuration(),
                threshold: 30000,
                evaluationPeriods: 3,
                datapointsToAlarm: 2,
                comparisonOperator: cw.ComparisonOperator.GREATER_THAN_THRESHOLD,
                alarmDescription: `${lambda.functionName} duration > 5s`,
                alarmName: `Ascribe-Lambda-${lambda.functionName}-Timeout-Errors`,
                actionsEnabled: true
            }).addAlarmAction(new actions.SnsAction(alarmTopic));
        });

        // DynamoDB Monitoring
        // API Gateway Monitoring
        // S3 Monitoring
        // Cognito Monitoring
        // Dashboards
        // Custom Metrics
    }
}


// DynamoDB:

    // Read/write capacity utilization

    // Throttled requests

    // Latency metrics

    // Conditional check failures

// API Gateway:

    // 4xx/5xx error rates

    // Cache hit/miss

    // Integration latency

    // Request counts by method

// S3:

    // Bucket size metrics

    // Number of objects

    // Unauthorized access attempts

    // Data transfer volume

// Custom Business Metrics:

    // Documents processed/hour

    // Search terms frequency

    // User activity levels

    // Text extraction accuracy rates

// Alerting:

    // Email/SMS notifications

    // Slack integration

    // PagerDuty for critical alerts

    // Escalation policies

// Dashboards:

    // System health overview

    // User activity trends

    // Cost monitoring

    // Performance benchmarks