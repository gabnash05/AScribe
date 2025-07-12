import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Auth } from "./components/Auth";
import { UploadForm } from "./components/UploadForm";
import { DocumentViewer } from "./components/DocumentViewer";

function App() {
    const [idToken, setIdToken] = useState<string | null>(null);
    const [identityId, setIdentityId] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        AccessKeyId: string;
        SecretKey: string;
        SessionToken: string;
    } | null>(null);

    const [documentId, setDocumentId] = useState<string | null>(null);
    const [uploadCompleted, setUploadCompleted] = useState(false);

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

    const handleUploadStart = () => {
        const newId = uuidv4();
        setDocumentId(newId);
        setUploadCompleted(false);
    };

    const handleUploadComplete = () => {
        setUploadCompleted(true);
    };

    if (!idToken || !identityId || !credentials) {
        return (
            <div className="items-center justify-center min-h-screen px-4">
                <Auth onAuthSuccess={handleAuthSuccess} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8 font-sans">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">AScribe Test Interface</h1>
                <hr className="border-t border-gray-300" />
            </header>

            <button
                onClick={handleUploadStart}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
                Start New Upload
            </button>

            {documentId && (
                <>
                    <UploadForm
                        identityId={identityId}
                        credentials={credentials}
                        documentId={documentId}
                        onUploadComplete={handleUploadComplete}
                    />

                    <DocumentViewer
                        identityId={identityId}
                        idToken={idToken}
                        documentId={documentId}
                        credentials={credentials}
                        shouldFetch={uploadCompleted}
                        onFetchComplete={() => setUploadCompleted(false)}
                    />
                </>
            )}
        </div>
    );
}

export default App;
