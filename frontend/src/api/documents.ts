import axios from "axios";

import { buildUrl } from "../utils/buildUrl";

export async function getDocument(userId: string, documentId: string, idToken: string) {
    const url = buildUrl(`documents/${userId}/${documentId}`);
    
    try {
        const res = await axios.get(url, {
            headers: { 
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
        });

        return res.data;
    } catch (error) {
        console.error(error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || "An error occurred."}`);
        } else {
            throw new Error("Network error: Unable to reach the server.");
        }
    }
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

    try {
        if (!userId || !documentId || !idToken || !finalizedText || !newFilePath || !Array.isArray(tags)) {
            throw new Error("Invalid input parameters");
        }

        if (tags.length > 10) {
            throw new Error("Tags array cannot exceed 10 items");
        }

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
    } catch (error) {
        console.error("Error finalizing document:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || "An error occurred."}`);
        } else {
            throw new Error("Network error: Unable to reach the server.");
        }
    }
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

export async function deleteDocument(documentId: string, userId: string, idToken: string): Promise<void> {
    const url = buildUrl(`documents/${userId}/${documentId}`);
    try {
        const response = await axios.delete(url, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                "Content-Type": "application/json",
            },
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new Error(response.data?.error || 'Failed to delete document.');
        }

        console.log(`Document ${documentId} deleted successfully`);
    } catch (error) {
        console.error("Error deleting document:", error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || "An error occurred."}`);
        } else {
            throw new Error("Network error: Unable to reach the server.");
        }
    }
}