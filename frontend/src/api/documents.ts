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

export interface DocumentPathInfo {
    filePath: string;
    documentId: string;
}

export async function getDocumentFilePaths({
    userId,
    idToken,
}: {
    userId: string;
    idToken: string;
}): Promise<DocumentPathInfo[]> {
    const url = buildUrl(`documents/${userId}/filePaths`);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                "Content-Type": "application/json",
            },
        });

        const items = response.data?.filePaths;

        if (!Array.isArray(items)) {
            throw new Error("Invalid response: filePaths should be an array");
        }

        const validItems: DocumentPathInfo[] = items.filter(
            (item: any): item is DocumentPathInfo =>
                typeof item?.filePath === "string" && typeof item?.documentId === "string"
        );

        return validItems;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const apiError = error.response?.data?.error || error.message;
            throw new Error(`Failed to fetch file paths: ${apiError}`);
        }

        throw new Error(
            `Unexpected error during document file path fetch: ${
                error instanceof Error ? error.message : "Unknown error"
            }`
        );
    }
}

export async function deleteDocumentFromDynamoDB(documentId: string, userId: string): Promise<void> {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${userId}/${documentId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete document.');
        }

        console.log(`Document ${documentId} deleted successfully`);
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
}
