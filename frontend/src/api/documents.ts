import axios from "axios";

const REGION = import.meta.env.VITE_AWS_REGION;
const API_ID = import.meta.env.VITE_API_ID;
const STAGE = import.meta.env.VITE_STAGE;

function buildUrl(path: string) {
    return `https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}/${path}`;
}

export async function getDocument(userId: string, documentId: string, idToken: string) {
    const url = buildUrl(`documents/${userId}/${documentId}`);
    
    const res = await axios.get(url, {
        headers: { 
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        },
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
