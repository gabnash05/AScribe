import type { Credentials } from "@aws-sdk/client-cognito-identity";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET_NAME = "ascribe-document-bucket-dev";
const REGION = "ap-southeast-2";

export async function uploadToS3(
    file: File,
    identityId: string,
    documentId: string,
    credentials: Credentials,
): Promise<string> {
    if (
        !credentials.AccessKeyId ||
        !credentials.SecretKey ||
        !credentials.SessionToken
    ) {
        throw new Error("Invalid AWS credentials: one or more fields are undefined.");
    }

    const s3 = new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretKey,
            sessionToken: credentials.SessionToken,
        }
    });

    const key = `temp/${identityId}/${documentId}/${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: uint8,
        ContentType: file.type,
        Metadata: {
            "uploaded-by": identityId,
            "document-id": documentId,
            "original-filename": file.name,
        },
    });

    await s3.send(command);
    return key;
}