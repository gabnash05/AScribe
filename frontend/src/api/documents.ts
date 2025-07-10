import axios from "axios";

const REGION = "ap-southeast-2";
const API_ID = "pqyri6a4uc";
const STAGE = "prod";

function buildUrl(path: string) {
    return `https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}/${path}`;
}

export async function getDocument(
    userId: string, 
    documentId: string, 
    idToken: string
) {
    const url = buildUrl(`documents/${userId}/${documentId}`);

    console.log({
        userId,
        documentId,
        idToken
    })

    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${idToken}` },
    });

    return res.data;
}

export async function finalizeDocument(
    userId: string,
    documentId: string,
    idToken: string,
    finalizedText: string,
    newFilePath: string,
    tags: string[],
) {
    const url = buildUrl(`documents/${userId}/${documentId}/finalize`);

    console.log({
        userId,
        documentId,
        finalizedText,
        newFilePath: newFilePath,
        newTags: tags,
    });

    const res = await axios.post(
        url,
        {
            userId,
            documentId,
            finalizedText,
            newFilePath: newFilePath,
            newTags: tags,
        },
        {
            headers: { Authorization: `Bearer ${idToken}` },
        }
    );

    return res.data;
}
