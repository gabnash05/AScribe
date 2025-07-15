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
                emailSubject: 'AScribe: Verify Your Email Address',
                emailBody: `
                    <html>
                        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #2c3e50; background-color: #f9f9f9; padding: 40px;">
                            <table style="max-width: 600px; margin: auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                                <tr>
                                    <td>
                                        <h2 style="color: #1B73D3; margin-bottom: 20px;">Welcome to AScribe!</h2>
                                        <p style="margin-bottom: 16px;">Thank you for signing up. To complete your registration, please verify your email address by clicking the link below:</p>
                                        <p style="word-break: break-all; font-size: 14px; color: #555;">{##Verify Email##}</p>
                                        <p style="margin-top: 32px;">Thank you,<br/>The AScribe Team</p>
                                    </td>
                                </tr>
                            </table>
                        </body>
                    </html>
                `,
                emailStyle: VerificationEmailStyle.LINK,
            },
            userInvitation: {
                emailSubject: 'AScribe Invitation: Your Account Details',
                emailBody: `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h2 style="color: #D5AD36;">Hello {username},</h2>
                            <p>You have been invited to join <strong>AScribe</strong>, a platform for intelligent document management and analysis.</p>
                            <p>Your temporary password is:</p>
                            <p style="font-size: 1.2em; font-weight: bold; color: #1B73D3;">{####}</p>
                            <p>Please log in using this password and update your credentials at your earliest convenience.</p>
                            <p>If you have any issues accessing your account, feel free to reach out to our support team.</p>
                            <p>Welcome aboard,<br/>The AScribe Team</p>
                        </body>
                    </html>
                `,
            },
        });

        this.userPool.addDomain('AScribeUserPoolDomain', {
            cognitoDomain: {
                domainPrefix: 'ascribe-dev',
            },
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