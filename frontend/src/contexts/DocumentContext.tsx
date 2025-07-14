import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";

interface DocumentState {
    documentId: string | null;
    uploadCompleted: boolean;
}

interface DocumentContextType extends DocumentState {
    generateNewDocumentId: () => string;
    setUploadCompleted: (completed: boolean) => void;
    resetDocumentState: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<DocumentState>({
        documentId: null,
        uploadCompleted: false,
    });

    const generateNewDocumentId = () => {
        const newId = uuidv4();
        setState({ documentId: newId, uploadCompleted: false });
        return newId;
    };

    const setUploadCompleted = (completed: boolean) => {
        setState(prev => ({ ...prev, uploadCompleted: completed }));
    };

    const resetDocumentState = () => {
        const newId = uuidv4();
        setState({ documentId: newId, uploadCompleted: false });
    };

    const value: DocumentContextType = {
        documentId: state.documentId,
        uploadCompleted: state.uploadCompleted,
        generateNewDocumentId,
        setUploadCompleted,
        resetDocumentState,
    };

    return (
        <DocumentContext.Provider value={value}>
            {children}
        </DocumentContext.Provider>
    );
};

export const useDocument = () => {
    const context = useContext(DocumentContext);
    if (!context) {
        throw new Error("useDocument must be used within a DocumentProvider");
    }
    return context;
};
