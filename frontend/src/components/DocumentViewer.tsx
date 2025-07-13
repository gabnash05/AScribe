import React, { useState, useEffect } from "react";
import { getDocument, finalizeDocument } from "../api/documents.ts";
import { getDocumentTextFromS3 } from "../api/s3.ts";

import MDEditor from '@uiw/react-md-editor';


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
    const [finalizing, setFinalizing] = useState<boolean>(false);

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

                        const bodyText = await getDocumentTextFromS3(credentials, doc.textFileKey)

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
        setFinalizing(true);
        setLoading(true);

        try {
            await finalizeDocument(identityId, documentId, idToken, text, filePath, tags);
            setStatusMessage("Document finalized successfully.");
        } catch (err) {
            console.error("Finalization error:", err);
            setStatusMessage("Failed to finalize document.");
        } finally {
            setFinalizing(false);
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
        <div className="relative bg-white rounded-xl shadow-md p-6 space-y-6 min-h-[600px]">
            {/* Loading Overlay */}
            {(loading || finalizing) && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-700 font-medium">
                        {finalizing ? "Finalizing Document..." : "Fetching Document..."}
                    </p>
                </div>
            )}

            <h3 className="text-2xl font-semibold text-gray-700">Extracted Text Viewer</h3>

            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-gray-600">File Path</label>
                    <input
                        type="text"
                        value={filePath}
                        onChange={(e) => setFilePath(e.target.value)}
                        placeholder="/folder/file.txt"
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-gray-600">Tags</label>
                    <input
                        type="text"
                        value={tags.join(", ")}
                        onChange={handleTagsChange}
                        placeholder="tag1, tag2"
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                    />
                </div>

                <div data-color-mode="light" className="my-5">
                    <label className="text-sm font-medium text-gray-600">Extracted Text</label>
                    <MDEditor
                        value={text}
                        onChange={(value) => setText(value ?? "")}
                        height={400}
                        className="markdown-preview"
                    />
                </div>

                <button
                    onClick={handleFinalize}
                    disabled={!text || loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition disabled:opacity-50"
                >
                    Finalize Document
                </button>

                {statusMessage && (
                    <p className="text-sm text-gray-500 mt-1">{statusMessage}</p>
                )}
            </div>
        </div>
    );
};