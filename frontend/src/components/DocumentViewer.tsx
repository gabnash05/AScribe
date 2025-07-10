import React, { useState } from "react";
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
};

export const DocumentViewer: React.FC<ViewerProps> = ({
    identityId,
    idToken,
    documentId,
    credentials,
}) => {
    const [text, setText] = useState<string>("");
    const [filePath, setFilePath] = useState<string>("/verified/notes/");
    const [tags, setTags] = useState<string[]>(["verified", "final"]);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const fetchText = async () => {
        try {
            setLoading(true);
            const doc = await getDocument(identityId, documentId, idToken);

            if (doc.status !== "cleaned" || !doc.textFileKey) {
                setText("");
                setStatusMessage(`Status: ${doc.status}`);
                return;
            }

            setStatusMessage("Fetching extracted text from S3...");

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
            const stream = res.Body;
            const bodyText = await streamToString(stream);

            setText(bodyText);
            setStatusMessage("✅ Extracted text loaded.");
        } catch (err) {
            console.error("Failed to fetch text:", err);
            setText("");
            setStatusMessage("❌ Error fetching text.");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        try {
            await finalizeDocument(identityId, documentId, idToken, text, filePath, tags);
            alert("✅ Document finalized.");
        } catch (err) {
            console.error("Finalization error:", err);
            alert("❌ Failed to finalize document.");
        }
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const tagList = input.split(",").map((t) => t.trim()).filter((t) => t !== "");
        setTags(tagList);
    };

    return (
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">📝 View & Finalize Extracted Text</h3>

            <button
                onClick={fetchText}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Fetching..." : "Fetch Extracted Text"}
            </button>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📁 File Path:</label>
                <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="/verified/notes/"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🏷️ Tags (comma-separated):</label>
                <input
                    type="text"
                    value={tags.join(", ")}
                    onChange={handleTagsChange}
                    placeholder="tag1, tag2"
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">📄 Extracted Text:</label>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Text will appear here after fetch"
                    rows={15}
                    className="w-full px-3 py-2 border rounded-md font-mono focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <button
                onClick={handleFinalize}
                disabled={!text}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                ✅ Finalize Document
            </button>

            {statusMessage && (
                <p className="text-sm text-gray-600 mt-2">{statusMessage}</p>
            )}
        </div>
    );
};

async function streamToString(stream: any): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");
    let result = "";
    let done = false;

    while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (value) {
            result += decoder.decode(value, { stream: true });
        }
        done = streamDone;
    }

    return result;
}
