import { useEffect, useState } from "react";
import { getDocument, deleteDocumentFromDynamoDB } from "../api/documents";
import { getDocumentTextFromS3 } from "../api/s3";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import { FaTimes, FaEdit, FaTrash, FaQuestion } from "react-icons/fa";
import ConfirmationDialog from "./ConfirmationDialog";

interface FileViewerModalProps {
    documentId: string;
    filePath: string;
    onClose: () => void;
}

export default function FileViewerModal({ documentId, filePath, onClose }: FileViewerModalProps) {
    const { credentials, identityId, idToken } = useAuth();
    const [content, setContent] = useState<string>("");
    const [documentTags, setDocumentTags] = useState<string[]>([]);
    const [tagDraft, setTagDraft] = useState<string>("");
    const [createdAt, setCreatedAt] = useState<string | undefined>();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function loadDocument() {
            try {
                setLoading(true);

                if (!documentId || !identityId || !idToken) {
                    console.error("Missing documentId, identityId, or idToken");
                    return;
                }

                const doc = await getDocument(identityId, documentId, idToken);
                const text = await getDocumentTextFromS3(credentials!, doc.textFileKey);

                setContent(text);
                setDraft(text);
                setDocumentTags(doc.tags ?? []);
                setTagDraft((doc.tags ?? []).join(", "));
                setCreatedAt(doc.createdAt);
            } catch (err) {
                console.error("Error loading document:", err);
            } finally {
                setLoading(false);
            }
        }

        loadDocument();
    }, [documentId, filePath, identityId, idToken]);

    useEffect(() => {
        return () => {
            // Reset all state when the modal closes or when documentId changes
            setContent("");
            setDocumentTags([]);
            setTagDraft("");
            setCreatedAt(undefined);
            setIsEditing(false);
            setDraft("");
        };
    }, [documentId]);

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTagDraft(e.target.value);
    };

    const handleSave = () => {
        setContent(draft);
        setIsEditing(false);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await deleteDocumentFromDynamoDB(documentId, identityId!);
            onClose();
        } catch (err) {
            console.error("Failed to delete:", err);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="relative bg-white rounded-xl shadow-md p-15 w-full h-full max-w-[70vw] max-h-[90vh] overflow-y-auto space-y-6">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-700 mt-2">Loading document...</p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="absolute top-4 right-6 text-gray-500 hover:text-gray-700"
                >
                    <FaTimes size={24} />
                </button>

                <h2 className="text-5xl font-semibold text-gray-800">
                    {filePath.split("/").pop()}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium ${
                            isEditing ? 'text-black': 'text-gray-400'
                        }`}>Tags</label>

                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={tagDraft}
                                onChange={handleTagsChange}
                                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                                    isEditing && !loading
                                        ? 'text-black border-gray-400'
                                        : 'text-gray-400 border-gray-300'
                                }`}
                                disabled={!isEditing || loading}
                            />
                        </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-15">
                        {createdAt && <p>Created: {new Date(createdAt).toLocaleString()}</p>}
                    </div>

                    {isEditing ? (
                        <>  
                            <div data-color-mode="light">
                                <MDEditor value={draft} onChange={(val) => setDraft(val ?? "")} height={500} />
                            </div>
                            <div className="flex justify-end gap-3 markdown-preview">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-gray-600 hover:underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Save
                                </button>
                            </div>
                        </>
                    ) : (
                        <div data-color-mode="light" className="my-5 prose max-x-none">
                            <MDEditor.Markdown source={content} className="markdown-preview"/>
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
                        >
                            <FaEdit /> Edit
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 flex items-center gap-2"
                        >
                            <FaTrash /> Delete
                        </button>
                        <button
                            onClick={() => navigate(`/questions/${documentId}`, {
                                state: {
                                    filePath: filePath,
                                    documentId: documentId,
                                    returnPath: '/explore',
                                    // Include expanded paths in the navigation state
                                    expandedPaths: filePath.split('/').slice(0, -1).map((_, i, arr) => 
                                        arr.slice(0, i + 1).join('/')
                                    )
                                }
                            })}
                            className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                        >
                            <FaQuestion /> Questions
                        </button>
                    </div>
                )}

                {showDeleteConfirm && (
                    <ConfirmationDialog
                        message="Delete this file and all its questions?"
                        onConfirm={confirmDelete}
                        onCancel={() => setShowDeleteConfirm(false)}
                    />
                )}
            </div>
        </div>
    );
}
