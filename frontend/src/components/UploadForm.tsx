import React, { useRef, useState } from "react";
import { uploadToS3 } from "../api/s3";
import { useAuth } from "../contexts/AuthContext";
import { useDocument } from "../contexts/DocumentContext";

export const UploadForm = () => {
    const { identityId, credentials } = useAuth();
    const { generateNewDocumentId, setUploadCompleted } = useDocument();
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{text: string; isError: boolean} | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleUpload = async () => {
        if (!file || !identityId || !credentials) {
            setStatusMessage({
                text: "Missing required information for upload",
                isError: true
            });
            return;
        }

        setIsUploading(true);
        setStatusMessage({text: "Uploading document...", isError: false});

        try {
            const docId = generateNewDocumentId();
            
            await uploadToS3(file, identityId, docId, credentials);
            setFile(null);
            setStatusMessage({
                text: "Upload complete! Processing your document...",
                isError: false
            });
            setUploadCompleted(true);
        } catch (error) {
            console.error("Upload failed:", error);
            setStatusMessage({
                text: "Upload failed. Please try again.",
                isError: true
            });
        } finally {
            setIsUploading(false);
            setTimeout(() => setStatusMessage(null), 5000);
        }
    };

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
            // Reset any previous messages when new file is selected
            setStatusMessage(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setStatusMessage(null);
        }
    };

    return (
        <div className="rounded-xl p-6 space-y-6 min-h-[200px] flex flex-col items-center">
            <h3 className="text-2xl font-semibold text-gray-700 text-center">Upload File</h3>

            <div
                className={`flex-1 border-2 border-dashed rounded-md transition p-6 flex items-center justify-center text-center cursor-pointer 
                ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"} w-full md:w-1/2`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png" // Specify accepted file types
                />
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full md:w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
                {isUploading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                    </>
                ) : "Upload"}
            </button>

            {statusMessage && (
                <p className={`text-sm text-center font-medium ${
                    statusMessage.isError ? "text-red-600" : "text-green-600"
                }`}>
                    {statusMessage.text}
                </p>
            )}
        </div>
    );
};