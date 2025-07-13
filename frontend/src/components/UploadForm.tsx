import React, { useRef, useEffect, useState } from "react";
import { uploadToS3 } from "../api/s3";

interface UploadFormProps {
    identityId: string;
    credentials: any;
    documentId: string;
    onUploadComplete: () => void;
    onUploadStart: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
    identityId,
    credentials,
    documentId,
    onUploadComplete,
    onUploadStart,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null); // 🆕
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!documentId) {
            onUploadStart();
        }
    }, [documentId, onUploadStart]);

    const handleUpload = async () => {
        if (!file) return;

        await uploadToS3(file, identityId, documentId, credentials);

        setFile(null);
        setStatusMessage("Upload complete! View and finalize below.");
        onUploadComplete();

        // Optional: auto-hide message after 5 seconds
        setTimeout(() => setStatusMessage(null), 5000);
    };

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    };

    return (
        <div className="rounded-xl p-6 space-y-6 min-h-[200px] flex flex-col items-center">
            <h3 className="text-2xl font-semibold text-gray-700 text-center">Upload File</h3>

            <div
                className={`flex-1 border-2 border-dashed rounded-md transition p-6 flex items-center justify-center text-center cursor-pointer 
                ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"} w-1/2`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
            >
                <div className="space-y-2">
                    {file ? (
                        <p className="text-gray-800 font-medium">📄 Selected: {file.name}</p>
                    ) : (
                        <>
                            <p className="text-gray-600">Drag & drop your file here</p>
                            <p className="text-gray-400 text-sm">or click to select a file</p>
                        </>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
            </div>

            <button
                onClick={handleUpload}
                disabled={!file}
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition disabled:opacity-50"
            >
                Upload
            </button>

            {/* ✅ Status Message */}
            {statusMessage && (
                <p className="text-sm text-green-600 text-center font-medium">
                    {statusMessage}
                </p>
            )}
        </div>
    );
};
