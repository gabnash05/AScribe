import { Stack, StackProps } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import { Duration } from 'aws-cdk-lib';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';

import { AscribeAppProps } from '../types/ascribe-app-types';

interface MonitoringStackProps extends AscribeAppProps {
    criticalLambdas: Function[];
    regularLambdas: Function[];
    apiGateway: RestApi;
}

export class MonitoringStack extends Stack {
    constructor(scope: Construct, id: string, props: MonitoringStackProps) {
        super(scope, id, props);

        const { criticalLambdas, regularLambdas, apiGateway } = props;

        // Notification Topic for Alarms
        const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
            displayName: `AScribe Alarms`,
        });
        alarmTopic.addSubscription(new subscriptions.EmailSubscription('nasayaokim@gmail.com')); // TODO: Change email

        // Critical Lambdas Alarm (Max 5 Alarms)
        criticalLambdas.forEach(lambda => {
            new cw.Alarm(this, `Lambda-${lambda.node.id}-Errors`, {
                metric: lambda.metricErrors({
                    period: Duration.seconds(60)
                }),
                threshold: 1,
                evaluationPeriods: 1,
                treatMissingData: cw.TreatMissingData.IGNORE,
                alarmDescription: `${lambda.functionName} has errors`,
                alarmName: `Ascribe-Lambda-${lambda.functionName}-Errors`,
                comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            }).addAlarmAction(new actions.SnsAction(alarmTopic));
        });

        // Regular Lambdas Alarm (1 Alarm)
        const regularLambdasErrorMetrics = new cw.MathExpression({
            expression: `SUM(METRICS())`,
            usingMetrics: Object.fromEntries(
                regularLambdas.map(lambda => [
                    lambda.functionName,
                    lambda.metricErrors({ period: Duration.minutes(5) })
                ])
            ),
            label: 'TotalNonCriticalLambdaErrors'
        });

        // Alert if 5+ errors across all non-critical Lambdas
        new cw.Alarm(this, 'NonCriticalLambdaErrors', {
            metric: regularLambdasErrorMetrics,
            threshold: 5,
            evaluationPeriods: 1,
            alarmDescription: 'Aggregate error count across non-critical Lambdas exceeded threshold.',
            alarmName: 'AScribe-NonCriticalLambdas-Errors',
            treatMissingData: cw.TreatMissingData.IGNORE,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        // API Gateway 5XX errors (1 alarm)
        new cw.Alarm(this, 'Api5XXErrors', {
            metric: apiGateway.metricServerError({ period: Duration.minutes(5) }),
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cw.TreatMissingData.NOT_BREACHING,
            alarmDescription: 'API Gateway is returning 5XX errors.',
            alarmName: 'AScribe-ApiGateway-5XX',
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        // AWS Bedrock (1 alarm)
        const totalTokens = new cw.MathExpression({
            expression: 'input + output',
            usingMetrics: {
                input: new cw.Metric({
                    namespace: 'AWS/Bedrock',
                    metricName: 'InputTokenCount',
                    statistic: 'Sum',
                    period: Duration.hours(1),
                }),
                output: new cw.Metric({
                    namespace: 'AWS/Bedrock',
                    metricName: 'OutputTokenCount',
                    statistic: 'Sum',
                    period: Duration.hours(1),
                }),
            },
            label: 'TotalTokensUsed',
        });

        new cw.Alarm(this, 'BedrockTokenUsageAlarm', {
            metric: totalTokens,
            threshold: 500_000, // 500K tokens/hour
            evaluationPeriods: 1,
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cw.TreatMissingData.NOT_BREACHING,
            alarmName: 'AScribe-Bedrock-TokenUsage',
            alarmDescription: 'Total Bedrock token usage exceeded hourly threshold.',
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        // Cost Monitoring
        new cw.Alarm(this, 'MonthlyCostAlert', {
            metric: new cw.Metric({
                namespace: 'AWS/Billing',
                metricName: 'EstimatedCharges',
                dimensionsMap: {
                    Currency: 'USD',
                },
                statistic: 'Maximum',
                period: Duration.hours(24)
            }),
            threshold: 1,
            evaluationPeriods: 1,
            alarmDescription: 'Estimated monthly AWS charges exceeded $10.',
            alarmName: 'AScribe-Billing-Threshold',
            comparisonOperator: cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new actions.SnsAction(alarmTopic));

        // Log all Lambda errors to CloudWatch Logs
        criticalLambdas.concat(regularLambdas).forEach(lambda => {
            lambda.addEnvironment('LOG_ERRORS', 'true');
        });
    }
}