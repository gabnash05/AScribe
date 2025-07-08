import { Stack, StackProps } from 'aws-cdk-lib';
import { UserPool, UserPoolClient, AccountRecovery, VerificationEmailStyle, UserPoolClientIdentityProvider, CfnIdentityPool, CfnIdentityPoolRoleAttachment } from 'aws-cdk-lib/aws-cognito';
import { Role, FederatedPrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AscribeAppProps } from '../types/ascribe-app-types';

interface AuthStackProps extends AscribeAppProps {
    documentBucketName: string;
}

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
                mutable: true,
             },                givenName: {
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

        // Identity Pool
        const identityPool = new CfnIdentityPool(this, 'AScribeIdentityPool', {
            identityPoolName: 'AScribeIdentityPool',
            allowUnauthenticatedIdentities: false, // change to true if you want guest access
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });

        // IAM Role for authenticated users
        const authenticatedRole = new Role(this, 'AScribeAuthenticatedRole', {
            assumedBy: new FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud': identityPool.ref,
                    },
                        'ForAnyValue:StringLike': {
                            'cognito-identity.amazonaws.com:amr': 'authenticated',
                    },
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
        });

        authenticatedRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
                resources: [
                    `arn:aws:s3:::${props.documentBucketName}/temp/\${cognito-identity.amazonaws.com:sub}/*`,
                    `arn:aws:s3:::${props.documentBucketName}/extracted-texts/*`,
                ]
            })
        );

        authenticatedRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['execute-api:Invoke'],
                resources: [
                    '*' // TODO: Restrict to specific API Gateway resources
                ]
            })
        );

        // Attach role to Identity Pool
        new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
                // unauthenticated: unauthenticatedRole.roleArn // Optional
            },
        });
    }
}