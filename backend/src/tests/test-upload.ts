import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    AdminInitiateAuthCommand,
    InitiateAuthCommand,
    ConfirmSignUpCommand,
    AuthFlowType
} from "@aws-sdk/client-cognito-identity-provider";

import {
    CognitoIdentityClient,
    GetIdCommand,
    GetCredentialsForIdentityCommand
} from "@aws-sdk/client-cognito-identity";

import {
    S3Client,
    PutObjectCommand
} from "@aws-sdk/client-s3";

import { readFileSync } from 'fs';
import path from 'path';

/////////////////////////////////////
// 🔧 CONFIGURATION 
/////////////////////////////////////

const REGION = "ap-southeast-2";
const USER_POOL_ID = "ap-southeast-2_RjIpxoLYT";
const CLIENT_ID = "4bqaia719uaifjt73rmck3mie7";
const IDENTITY_POOL_ID = "ap-southeast-2:a9e83f23-bb7e-45a7-bb5b-85320fed8197";
const BUCKET_NAME = "ascribe-document-bucket-dev";

const USER_NAME = "gab"
const TEST_EMAIL = "nasayaokim@gmail.com";
const TEST_PASSWORD = "ExamplePass123!";
const TEST_FILE_PATH = path.resolve(__dirname, "test.jpg");
const DOCUMENT_ID = "test-doc-123";

/////////////////////////////////////

async function signUpUser() {
    const client = new CognitoIdentityProviderClient({ region: REGION });

    const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: USER_NAME,
        Password: TEST_PASSWORD,
        UserAttributes: [
            { Name: "email", Value: TEST_EMAIL },
            { Name: "given_name", Value: "Test" }
        ]
    });

    try {
        const response = await client.send(command);
        console.log("Sign-up initiated:", response);
    } catch (err: any) {
        if (err.name === "UsernameExistsException") {
            console.log("User already exists. Proceeding to sign in...");
        } else {
            throw err;
        }
    }
}

async function signInUser(): Promise<string> {
    const client = new CognitoIdentityProviderClient({ region: REGION });

    const authCommand = new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        AuthParameters: {
            USERNAME: USER_NAME,
            PASSWORD: TEST_PASSWORD,
        },
    });

    const response = await client.send(authCommand);
    const idToken = response.AuthenticationResult?.IdToken;
    if (!idToken) throw new Error("No ID token received after login.");

    console.log("User signed in. ID token received.");
    return idToken;
}

async function getTemporaryAWSCredentials(idToken: string) {
    const identityClient = new CognitoIdentityClient({ region: REGION });

    const identityIdResp = await identityClient.send(
        new GetIdCommand({
            IdentityPoolId: IDENTITY_POOL_ID,
            Logins: {
                [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
            }
        })
    );

    const identityId = identityIdResp.IdentityId!;
    console.log("Identity ID:", identityId);

    const credsResponse = await identityClient.send(
        new GetCredentialsForIdentityCommand({
            IdentityId: identityId,
            Logins: {
                [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken
            }
        })
    );

    const credentials = credsResponse.Credentials!;
    return { identityId, credentials };
}

async function uploadFileToS3(identityId: string, credentials: any) {
    const s3 = new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: credentials.AccessKeyId!,
            secretAccessKey: credentials.SecretKey!,
            sessionToken: credentials.SessionToken!
        }
    });

    const fileBuffer = readFileSync(TEST_FILE_PATH);
    const fileName = path.basename(TEST_FILE_PATH);
    const contentType = "image/jpeg"; // change based on your file type

    const s3Key = `temp/${identityId}/${DOCUMENT_ID}/${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
            // ✅ Must be lowercase to match Lambda expectation
            "uploaded-by": identityId,
            "document-id": DOCUMENT_ID,
            "original-filename": fileName
        }
    });

    await s3.send(command);
    console.log(`✅ Uploaded file to s3://${BUCKET_NAME}/${s3Key}`);
}

(async () => {
    try {
        await signUpUser();
        console.log("If this is a new user, confirm the account via the AWS Console first.");

        const idToken = await signInUser();
        const { identityId, credentials } = await getTemporaryAWSCredentials(idToken);

        await uploadFileToS3(identityId, credentials);
        console.log("Done! Your Lambda should now process the uploaded file.");
    } catch (err) {
        console.error("Error:", err);
    }
})();
