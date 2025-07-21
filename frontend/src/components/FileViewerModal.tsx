import { useState, useEffect } from "react";
import { FaTimes, FaEdit, FaTrash, FaQuestion } from "react-icons/fa";
import MDEditor from "@uiw/react-md-editor";
import { getDocumentTextFromS3 } from "../api/s3";
import { deleteDocumentFromDynamoDB, getDocument } from "../api/documents";
import ConfirmationDialog from "./ConfirmationDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface DocumentData {
    documentId: string;
    userId: string;
    filePath: string;
    tags?: string[];
    createdAt?: string;
    [key: string]: any;
}

interface FileViewerModalProps {
    documentId: string;
    filePath: string;
    onClose: () => void;
}

export default function FileViewerModal({ documentId, filePath, onClose }: FileViewerModalProps) {
    const { credentials, identityId, idToken } = useAuth();
    const [content, setContent] = useState<string | undefined>();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [documentData, setDocumentData] = useState<DocumentData | null>(null);
    const [showDelete, setShowDelete] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchDocumentDetails() {
            try {
                if (!documentId || !identityId || !idToken || !credentials) {
                    throw new Error("Missing identifiers for fetching document.");
                }

                const doc = await getDocument(identityId, documentId, idToken);
                const text = await getDocumentTextFromS3(credentials, filePath);

                setDocumentData(doc);
                setContent(text);
                setDraft(text);
            } catch (err) {
                console.error("Failed to fetch document data:", err);
            }
        }

        fetchDocumentDetails();
    }, [documentId, filePath, credentials, identityId, idToken]);

    const handleSave = () => {
        // Placeholder: Save edited markdown content
        setContent(draft);
        setIsEditing(false);
    };

    const confirmDelete = async () => {
        try {
            if (!documentId || !identityId) {
                throw new Error("Missing documentId or identityId.");
            }

            await deleteDocumentFromDynamoDB(documentId, identityId);
            setShowDelete(false);
            onClose();
        } catch (err) {
            console.error("Failed to delete document:", err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-3/4 max-w-xl p-6 relative space-y-4">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                >
                    <FaTimes />
                </button>

                <h2 className="text-xl font-bold text-gray-800">
                    {filePath.split("/").pop()}
                </h2>

                {documentData && (
                    <div className="text-sm text-gray-500 space-y-1">
                        <p><strong>Document ID:</strong> {documentData.documentId}</p>
                        <p><strong>Created:</strong> {new Date(documentData.createdAt || "").toLocaleString()}</p>
                        {documentData.tags?.length! > 0 && (
                            <p><strong>Tags:</strong> {documentData.tags!.join(", ")}</p>
                        )}
                    </div>
                )}

                {isEditing ? (
                    <>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setIsEditing(false)} className="text-gray-600 hover:underline">
                                Cancel
                            </button>
                        </div>
                        <MDEditor value={draft} onChange={(val) => setDraft(val || "")} height={300} />
                        <button
                            onClick={handleSave}
                            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                        >
                            Save
                        </button>
                    </>
                ) : (
                    <>
                        <div className="prose max-w-none overflow-auto">
                            <MDEditor.Markdown source={content || "Loading..."} />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
                            >
                                <FaEdit /> Edit
                            </button>
                            <button
                                onClick={() => setShowDelete(true)}
                                className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 flex items-center gap-2"
                            >
                                <FaTrash /> Delete
                            </button>
                            <button
                                onClick={() => navigate(`/questions/${documentId}`)}
                                className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                            >
                                <FaQuestion /> Questions
                            </button>
                        </div>
                    </>
                )}

                {showDelete && (
                    <ConfirmationDialog
                        message="Delete this file and all its questions?"
                        onConfirm={confirmDelete}
                        onCancel={() => setShowDelete(false)}
                    />
                )}
            </div>
        </div>
    );
}
