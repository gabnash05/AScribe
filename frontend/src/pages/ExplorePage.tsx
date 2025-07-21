import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDocumentFilePaths } from "../api/documents";
import { useAuth } from "../contexts/AuthContext";
import FolderTree from "../components/FolderTree";
import SearchBar from "../components/SearchBar";
import FileViewerModal from "../components/FileViewerModal";

export default function ExplorePage() {
    const [tree, setTree] = useState<any>({});
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const { identityId, idToken } = useAuth();

    useEffect(() => {
        async function fetchPaths() {
            if (!identityId) {
                return <div className="text-center text-gray-500 py-20">Loading identity...</div>;
            }

            const paths = await getDocumentFilePaths({
                userId: identityId!,
                idToken: idToken!,
            });

            setTree(buildFileTree(paths));
        }

        fetchPaths();
    }, []);

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
                    <FolderTree tree={tree} onFileSelect={setActiveFile} />

                    {activeFile && (
                        <FileViewerModal
                            filePath={activeFile}
                            onClose={() => setActiveFile(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper to build a nested file tree
function buildFileTree(paths: string[]) {
    const root: any = {};
    for (const path of paths) {
        const parts = path.split('/');
        let current = root;
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = index === parts.length - 1 ? null : {};
            }
            current = current[part];
        });
    }
    return root;
}
