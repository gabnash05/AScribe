import React, { useState, useEffect } from "react";
import { getDocument, finalizeDocument } from "../api/documents.ts";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

interface ViewerProps {
    identityId: string;
    idToken: string;
    documentId: string;
    credentials: {
        AccessKeyId: string;
        SecretKey: string;
        SessionToken: string;
    };
    shouldFetch: boolean;
    onFetchComplete: () => void;
}

export const DocumentViewer: React.FC<ViewerProps> = ({
    identityId,
    idToken,
    documentId,
    credentials,
    shouldFetch,
    onFetchComplete,
}) => {
    const [text, setText] = useState<string>("");
    const [filePath, setFilePath] = useState<string>("");
    const [tags, setTags] = useState<string[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!shouldFetch) return;

        let attempts = 0;
        let cancelled = false;

        const poll = async () => {
            const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
            const maxAttempts = 10;
            const baseDelay = 1000;

            setStatusMessage("⏳ Waiting for text extraction...");
            setLoading(true);

            while (attempts < maxAttempts && !cancelled) {
                try {
                    const doc = await getDocument(identityId, documentId, idToken);
                    console.log(doc)

                    if (doc.status === "cleaned" && doc.textFileKey) {
                        setFilePath(doc.filePath ?? "");
                        setTags(doc.tags ?? []);
                        setStatusMessage("✅ Extracted text is ready. Loading from S3...");

                        const s3 = new S3Client({
                            region: "ap-southeast-2",
                            credentials: {
                                accessKeyId: credentials.AccessKeyId,
                                secretAccessKey: credentials.SecretKey,
                                sessionToken: credentials.SessionToken,
                            },
                        });

                        const command = new GetObjectCommand({
                            Bucket: "ascribe-document-bucket-dev",
                            Key: doc.textFileKey,
                        });

                        const res = await s3.send(command);
                        const bodyText = await new Response(res.Body as ReadableStream).text();

                        setText(bodyText);
                        setStatusMessage("Extracted text loaded.");
                        onFetchComplete();
                        break;
                    } else {
                        setStatusMessage(`Waiting... Current status: ${doc.status}`);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                    setStatusMessage("Error polling document.");
                }

                attempts++;
                await delay(baseDelay * Math.pow(1.5, attempts));
            }

            if (attempts >= maxAttempts) {
                setStatusMessage("⚠️ Timed out waiting for document processing.");
            }

            setLoading(false);
        };

        poll();

        return () => {
            cancelled = true;
        };
    }, [shouldFetch]);

    const handleFinalize = async () => {
        setLoading(true);
        try {
            await finalizeDocument(identityId, documentId, idToken, text, filePath, tags);
            alert("Document finalized.");
        } catch (err) {
            console.error("Finalization error:", err);
            alert("Failed to finalize document.");
        } finally {
            setLoading(false);
        }
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const tagList = input
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== "");
        setTags(tagList);
    };

    return (
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">View & Finalize Extracted Text</h3>

            {loading && <p className="text-blue-600 text-sm">Loading...</p>}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Path:</label>
                <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="/science/biology/"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags:</label>
                <input
                    type="text"
                    value={tags.join(", ")}
                    onChange={handleTagsChange}
                    placeholder="tag1, tag2"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extracted Text:</label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Text will appear here after fetch"
                    rows={15}
                    className="w-full px-3 py-2 border rounded-md font-mono focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                />
            </div>

            <button
                onClick={handleFinalize}
                disabled={!text || loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                Finalize Document
            </button>

            {statusMessage && (
                <p className="text-sm text-gray-600 mt-2">{statusMessage}</p>
            )}
        </div>
    );
};