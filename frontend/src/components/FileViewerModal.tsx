import { useState, useEffect } from "react";
import { FaTimes, FaEdit, FaTrash, FaQuestion } from "react-icons/fa";
import MDEditor from '@uiw/react-md-editor';
import { getDocumentTextFromS3 } from "../api/s3";
import { deleteDocumentFromDynamoDB } from "../api/documents";
import ConfirmationDialog from "./ConfirmationDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function FileViewerModal({
    filePath,
    onClose,
}: {
    filePath: string;
    onClose: () => void;
}) {
    const { credentials, identityId } = useAuth();
    const [content, setContent] = useState<string | undefined>();
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [showDelete, setShowDelete] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchText() {
            const txt = await getDocumentTextFromS3(credentials!, filePath);
            setContent(txt);
            setDraft(txt);
        }
        fetchText();
    }, [filePath, credentials]);

    const handleSave = () => {
        // Save changes logic here (e.g. call update API)
        setContent(draft);
        setIsEditing(false);
    };

    const confirmDelete = async () => {
        try {
            const documentId = filePath.split("/").pop()?.split(".")[0]; // extract from filePath if stored like `documents/userId/documentId.txt`
            if (!documentId) {
                throw new Error("Could not extract documentId from file path.");
            }

            await deleteDocumentFromDynamoDB(documentId, identityId!);
            setShowDelete(false);
            onClose();
        } catch (err) {
            console.error("Failed to delete document:", err);
            // optionally show a toast or alert here
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

                {isEditing ? (
                <>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setIsEditing(false)} className="text-gray-600 hover:underline">
                            Cancel
                        </button>
                    </div>
                    <MDEditor value={draft} onChange={(value) => setDraft(value || "")} height={300} />
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
                            onClick={() => navigate(`/questions/${filePath}`)}
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
