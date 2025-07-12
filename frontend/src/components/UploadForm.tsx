import React, { useState } from "react";
import { uploadToS3 } from "../api/s3";

interface UploadFormProps {
    identityId: string;
    credentials: any;
    documentId: string;
    onUploadComplete: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
    identityId,
    credentials,
    documentId,
    onUploadComplete,
}) => {
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = async () => {
        if (!file) return;

        await uploadToS3(file, identityId, documentId, credentials);

        alert("File uploaded.");
        setFile(null);
        onUploadComplete();
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 text-center">Upload File</h3>

            <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            <button
                onClick={handleUpload}
                disabled={!file}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
            >
                Upload
            </button>
        </div>
    );
};
