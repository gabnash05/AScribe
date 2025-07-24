import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { UploadForm } from "../components/UploadForm";
import { DocumentViewer } from "../components/DocumentViewer";
import { useDocument } from "../contexts/DocumentContext";

export default function ScanPage() {
    const { uploadCompleted, setUploadCompleted } = useDocument();
    const documentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (uploadCompleted && documentRef.current) {
            documentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            setUploadCompleted(false);
        }
    }, [uploadCompleted]);

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 space-y-6">
            <header className="sticky top-0 bg-gray-100 z-10 pt-4 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                        Scan Documents
                    </h1>
                    <Link
                        to="/dashboard"
                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded transition flex items-center gap-1"
                    >
                        <span className="hidden sm:inline">Back to Menu</span>
                        <span className="sm:hidden">⬅</span>
                    </Link>
                </div>
                <hr className="border-t border-gray-300 mt-2" />
            </header>

            <div className="max-w-6xl mx-auto flex flex-col gap-6">
                <div className="w-full bg-white rounded-lg shadow-sm p-4">
                    <UploadForm />
                </div>

                <div className="w-full" ref={documentRef}>
                    <DocumentViewer />
                </div>
            </div>
        </div>
    );
}
