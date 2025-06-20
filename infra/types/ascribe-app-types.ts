import { StackProps } from 'aws-cdk-lib';

export interface AscribeAppProps extends StackProps {
    env: {
        account: string;
        region: string;
    };
    stage: string;
    tags: {
        Application: string;
        Environment: string;
    };
}