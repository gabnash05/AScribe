import { CognitoIdentityClient, GetCredentialsForIdentityCommand, GetIdCommand, type Credentials } from "@aws-sdk/client-cognito-identity";
import { AuthFlowType, CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand } from "@aws-sdk/client-cognito-identity-provider";

const REGION = "ap-southeast-2";
const USER_POOL_ID = "ap-southeast-2_ZpDpI8vBj";
const CLIENT_ID = "3ntp21ausu2tt8d0adgeuafmbr";
const IDENTITY_POOL_ID = "ap-southeast-2:779d9b6e-3ae6-4ff9-9680-c34449a02a18";

export async function signUp(username: string, password: string, email: string) {
    try {
        if (!username || !password || !email) {
            throw new Error("Username, password, and email are required.");
        }

        const client = new CognitoIdentityProviderClient({ region: REGION });

        const command = new SignUpCommand({
            ClientId: CLIENT_ID,
            Username: username,
            Password: password,
            UserAttributes: [{ Name: "email", Value: email }],
        });

        console.log(command)

        return client.send(command);
    } catch (error) {
        console.error("Error during sign up:", error);
        throw new Error(`Sign up failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export async function login(username: string, password: string): Promise<string | undefined> {
    try {
        if (!username || !password) {
            throw new Error("Username and password are required.");
        }

        const client = new CognitoIdentityProviderClient({ region: REGION });

        const command = new InitiateAuthCommand({
            ClientId: CLIENT_ID,
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            AuthParameters: { USERNAME: username, PASSWORD: password},
        })

        console.log(command)

        const response = await client.send(command);
        return response.AuthenticationResult?.IdToken;
    } catch (error) {
        console.error("Error during login:", error);
        throw new Error(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

export async function getAWSCredentials(idToken: string): Promise<{ identityId: string | undefined, credentials: Credentials | undefined }> {
    const identityClient = new CognitoIdentityClient({ region: REGION });

    const idResp = await identityClient.send(new GetIdCommand({
        IdentityPoolId: IDENTITY_POOL_ID,
        Logins: {
            [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
        }
    }));

    const credsResp = await identityClient.send(new GetCredentialsForIdentityCommand({
        IdentityId: idResp.IdentityId,
        Logins: {
            [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
        }
    }));

    return {
        identityId: idResp.IdentityId!,
        credentials: credsResp.Credentials!,
    }
}