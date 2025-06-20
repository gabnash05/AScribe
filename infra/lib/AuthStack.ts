import { Stack, StackProps } from 'aws-cdk-lib';
import { UserPool, UserPoolClient, AccountRecovery, VerificationEmailStyle, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { AscribeAppProps } from '../types/ascribe-app-types';

interface AuthStackProps extends AscribeAppProps {}

export class AuthStack extends Stack {
    public readonly userPool: UserPool;
    public readonly userPoolClient: UserPoolClient;
	
    constructor(scope: Construct, id: string, props: AuthStackProps) {
        super(scope, id, props);

        this.userPool = new UserPool(this, 'AScribeUserPool', {
            userPoolName: 'AScribeUserPool',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
                username: true,
                phone: false
            },
            passwordPolicy: {
                minLength: 8,
                requireDigits: true,
                requireLowercase: true,
                requireUppercase: true,
            },
            autoVerify: {
                email: true,
            },
            accountRecovery: AccountRecovery.EMAIL_ONLY,
            standardAttributes: {
                email: {
                    required: true,
                    mutable: false,
                },
                givenName: {
                    required: true,
                    mutable: true,
                }
            },
            userVerification: {
                emailSubject: 'Verify your email for AScribe',
                emailBody: 'Hello {username},\n\nPlease verify your email by clicking on the following link: {##Verify Email##}',
                emailStyle: VerificationEmailStyle.LINK,
            },
            userInvitation: {
                emailSubject: 'You have been invited to AScribe',
                emailBody: 'Hello {username},\n\nYou have been invited to join AScribe. Please use the following temporary password to log in: {####}',
            }
        });

        this.userPoolClient = new UserPoolClient(this, 'AScribeUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'AScribeUserPoolClient',
            supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
            },
        });
    }
}