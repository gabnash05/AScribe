import { StackProps } from 'aws-cdk-lib';

export interface AscribeAppProps extends StackProps {
    env: {
        account: string;
        region: string;
    };
    stage: string;
    masterUserName?: string;
    notificationEmail?: string;
    tags: {
        Application: string;
        Environment: string;
    };
}