import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Auth } from "./components/Auth";
import { UploadForm } from "./components/UploadForm";
import { DocumentViewer } from "./components/DocumentViewer";
import { DashboardMenu } from "./components/DashboardMenu";

export default function App() {
    const [idToken, setIdToken] = useState<string | null>(null);
    const [identityId, setIdentityId] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        AccessKeyId: string;
        SecretKey: string;
        SessionToken: string;
    } | null>(null);

    const [documentId, setDocumentId] = useState<string | null>(null);
    const [uploadCompleted, setUploadCompleted] = useState(false);

    const [view, setView] = useState<"menu" | "scan" | "explore">("menu");

    const handleAuthSuccess = (
        idToken: string,
        identityId: string,
        credentials: {
            AccessKeyId: string;
            SecretKey: string;
            SessionToken: string;
        }
    ) => {
        setIdToken(idToken);
        setIdentityId(identityId);
        setCredentials(credentials);
    };

    const onUploadStart = () => {
        const newId = uuidv4();
        setDocumentId(newId);
        setUploadCompleted(false);
    };

    const handleUploadComplete = () => {
        setUploadCompleted(true);
    };

    // if (!idToken || !identityId || !credentials) {
    //     return (
    //         <div className="min-h-screen bg-gray-100">
    //             <Auth onAuthSuccess={handleAuthSuccess} />
    //         </div>
    //     );
    // }

    if (view === "menu") {
        return (
            <DashboardMenu
                onSelectScan={() => setView("scan")}
                onSelectExplore={() => setView("explore")}
            />
        );
    }

    if (view === "explore") {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">📂 Explore Documents</h1>
                <p className="text-gray-600 mb-4">This feature is coming soon.</p>
                <button
                    onClick={() => setView("menu")}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Back to Menu
                </button>
            </div>
        );
    }

    // scan
    return (
        <div className="min-h-screen bg-gray-100 p-8 space-y-8">
            <header>
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Scan Documents</h1>
                    <button
                        onClick={() => setView("menu")}
                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 my-5 rounded transition"
                    >
                        ⬅ Back to Menu
                    </button>
                </div>
                <hr className="border-t border-gray-300" />
            </header>

            <div className="max-w-6xl mx-auto flex flex-col gap-8">
                <div className="w-full">
                    <UploadForm
                        identityId={identityId!}
                        credentials={credentials}
                        documentId={documentId!}
                        onUploadComplete={handleUploadComplete}
                        onUploadStart={onUploadStart}
                    />
                </div>

                <div className="w-full">
                    <DocumentViewer
                        identityId={identityId!}
                        idToken={idToken!}
                        documentId={documentId!}
                        credentials={credentials!}
                        shouldFetch={uploadCompleted}
                        onFetchComplete={() => setUploadCompleted(false)}
                    />
                </div>
            </div>
        </div>
    );
}