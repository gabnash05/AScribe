import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDocumentFilePaths } from "../api/documents";
import { useAuth } from "../contexts/AuthContext";

import { buildFileTree } from "../utils/buildFileTree";
import FolderTree from "../components/FolderTree";
import SearchBar from "../components/SearchBar";
import FileViewerModal from "../components/FileViewerModal";

export default function ExplorePage() {
    const [tree, setTree] = useState<any>({});
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
    const { identityId, idToken } = useAuth();

    useEffect(() => {
        async function fetchPaths() {
            if (!identityId) return;

            try {
                const fileEntries = await getDocumentFilePaths({
                    userId: identityId,
                    idToken: idToken!,
                });

                setTree(buildFileTree(fileEntries));
            } catch (error) {
                console.error("Failed to fetch file paths:", error);
            }
        }

        fetchPaths();
    }, [identityId, idToken]);

    function openFileViewer(filePath: string, documentId: string) {
        setActiveFilePath(filePath);
        setActiveDocumentId(documentId);
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Explore Documents</h1>
                    <Link
                        to="/dashboard"
                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition"
                    >
                        Back to Menu
                    </Link>
                </header>

                <SearchBar />

                <div className="bg-white mt-6 rounded-xl shadow-md p-6 overflow-x-auto">
                    <FolderTree
                        tree={tree}
                        onFileSelect={(filePath, documentId) => openFileViewer(filePath, documentId)}
                    />

                    {activeFilePath && activeDocumentId && (
                        <FileViewerModal
                            filePath={activeFilePath}
                            documentId={activeDocumentId}
                            onClose={() => {
                                setActiveFilePath(null);
                                setActiveDocumentId(null);
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
