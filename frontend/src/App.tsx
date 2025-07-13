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

    const onUploadStart = () => {
        const newId = uuidv4();
        setDocumentId(newId);
        setUploadCompleted(false);
    };

    const handleUploadComplete = () => {
        setUploadCompleted(true);
    };

    if (!idToken || !identityId || !credentials) {
        return (
            <div className="items-center justify-center min-h-screen bg-gray">
                <Auth onAuthSuccess={handleAuthSuccess} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Scan Documents</h1>
                <hr className="border-t border-gray-300" />
            </header>

            <div className="max-w-6xl mx-auto flex flex-col gap-8">
                <div className="w-full">
                    <UploadForm
                        identityId={identityId}
                        credentials={credentials}
                        documentId={documentId!}
                        onUploadComplete={handleUploadComplete}
                        onUploadStart={onUploadStart}
                    />
                </div>

                <div className="w-full">
                    <DocumentViewer
                        identityId={identityId}
                        idToken={idToken}
                        documentId={documentId!}
                        credentials={credentials}
                        shouldFetch={uploadCompleted}
                        onFetchComplete={() => setUploadCompleted(false)}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
