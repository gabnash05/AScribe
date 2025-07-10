import { useState } from "react";
import { Auth } from "./components/Auth";
import { UploadForm } from "./components/UploadForm";
import { DocumentViewer } from "./components/DocumentViewer";

const DOCUMENT_ID = "test-img-123";

function App() {
    const [idToken, setIdToken] = useState<string | null>(null);
    const [identityId, setIdentityId] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<{
        AccessKeyId: string;
        SecretKey: string;
        SessionToken: string;
    } | null>(null);

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

    if (!idToken || !identityId || !credentials) {
        return <Auth onAuthSuccess={handleAuthSuccess} />;
    }

    return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>📚 AScribe Test Interface</h1>
            <hr />

            <UploadForm
                identityId={identityId}
                credentials={credentials}
                documentId={DOCUMENT_ID}
            />

            <div style={{ marginTop: "2rem" }}>
                <DocumentViewer
                    identityId={identityId}
                    idToken={idToken}
                    documentId={DOCUMENT_ID}
                    credentials={credentials}
                />
            </div>
        </div>
    );
}

export default App;
