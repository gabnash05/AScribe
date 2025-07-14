import { CognitoIdentityClient, GetCredentialsForIdentityCommand, GetIdCommand, type Credentials } from "@aws-sdk/client-cognito-identity";
import { AuthFlowType, CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = import.meta.env.VITE_AWS_REGION;
const USER_POOL_ID = import.meta.env.VITE_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const IDENTITY_POOL_ID = import.meta.env.VITE_IDENTITY_POOL_ID;

export async function signUp(username: string, password: string, email: string) {
    if (!username || !password || !email) {
        throw new Error("Username, password, and email are required.");
    }

    const client = new CognitoIdentityProviderClient({ region: REGION });

    const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: [
            { Name: "email", Value: email },
            { Name: "given_name", Value: username }, 
        ],
    });

    try {
        return await client.send(command);
    } catch (error) {
        console.error("Sign up error:", error);
        throw new Error(`Sign up failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export async function login(username: string, password: string): Promise<string> {
    if (!username || !password) {
        throw new Error("Username and password are required.");
    }

    const client = new CognitoIdentityProviderClient({ region: REGION });

    const command = new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        },
    });

    try {
        const response = await client.send(command);
        if (!response.AuthenticationResult?.IdToken) {
            throw new Error("Login failed: No ID token returned.");
        }
        return response.AuthenticationResult.IdToken;
    } catch (error) {
        console.error("Login error:", error);
        throw new Error(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}


export async function getAWSCredentials(idToken: string): Promise<{
    identityId: string;
    credentials: Credentials;
}> {
    const identityClient = new CognitoIdentityClient({ region: REGION });

    const loginsKey = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

    try {
        const idResp = await identityClient.send(
            new GetIdCommand({
                IdentityPoolId: IDENTITY_POOL_ID,
                Logins: {
                    [loginsKey]: idToken,
                },
            })
        );

        const credsResp = await identityClient.send(
            new GetCredentialsForIdentityCommand({
                IdentityId: idResp.IdentityId,
                Logins: {
                    [loginsKey]: idToken,
                },
            })
        );

        return {
            identityId: idResp.IdentityId!,
            credentials: credsResp.Credentials!,
        };
    } catch (error) {
        console.error("Failed to get AWS credentials:", error);
        throw new Error(`Credential retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}