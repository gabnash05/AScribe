import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaPlus, FaMagic, FaBookOpen, FaQuestionCircle, FaSpinner } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import QuestionCard from "../components/QuestionCard";
import { getDocumentQuestions, createDocumentQuestions } from "../api/questions";
import type { Question } from "../api/questions";

export default function QuestionsPage() {
    const { documentId } = useParams();
    const { identityId, idToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showGeneratePopup, setShowGeneratePopup] = useState(false);
    const [generateCount, setGenerateCount] = useState<number>(5);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            if (!documentId || !identityId || !idToken) {
                throw new Error("Missing required parameters");
            }

            const questions = await getDocumentQuestions(identityId, documentId, idToken);
            setQuestions(questions);
        } catch (error) {
            console.error("Failed to load questions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (documentId && identityId && idToken) {
            fetchQuestions();
        }
    }, [documentId, identityId, idToken]);

    const handleGenerateQuestions = async () => {
        if (!documentId || !identityId || !idToken) return;
        
        setGenerating(true);
        try {
            await createDocumentQuestions(
                identityId,
                documentId,
                generateCount,
                idToken
            );

            await fetchQuestions();
            setShowGeneratePopup(false);
        } catch (error) {
            console.error("Failed to generate questions", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleBackToExplore = () => {
        navigate('/explore', {
            state: {
                filePath: location.state?.filePath,
                documentId: location.state?.documentId,
                // Pass along the expanded paths
                expandedPaths: location.state?.expandedPaths || []
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Questions</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowGeneratePopup(true)}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <FaSpinner className="animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    <FaMagic /> Generate
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleBackToExplore}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                        >
                            <FaPlus /> Create
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition"
                        >
                            Back
                        </button>
                    </div>
                </header>

                <div className="flex gap-3">
                    <button
                        onClick={() => 
                            navigate(`/documents/${documentId}/quiz`, {
                                state: {
                                    filePath: location.state?.filePath // ensure this is passed to enable correct return
                                }
                            })
                        }
                        className="text-sm bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 flex items-center gap-2"
                    >
                        <FaQuestionCircle /> Quiz
                    </button>
                    <button
                        onClick={() => navigate(`/documents/${documentId}/study`)}
                        className="text-sm bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
                    >
                        <FaBookOpen /> Study
                    </button>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-8">
                            <FaSpinner className="animate-spin text-gray-500 text-2xl" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No questions generated yet.</p>
                            <button
                                onClick={() => setShowGeneratePopup(true)}
                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Generate Questions
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {questions.map((q) => (
                                <QuestionCard key={q.questionId} question={q} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showGeneratePopup && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
                    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4 relative">
                        <button
                            onClick={() => setShowGeneratePopup(false)}
                            className="absolute text-4xl top-4 right-6 text-gray-500 hover:text-gray-700"
                        >
                            &times;
                        </button>
                        
                        <h2 className="text-xl font-semibold text-gray-800">Generate Questions</h2>
                        <p className="text-gray-600 text-sm">
                            AI will generate questions based on your document content.
                        </p>
                        
                        <div className="mt-4">
                            <label className="block text-gray-700 text-sm mb-1">
                                Number of questions (1-10)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={generateCount}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value >= 1 && value <= 10) {
                                        setGenerateCount(value);
                                    }
                                }}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowGeneratePopup(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                disabled={generating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateQuestions}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                                disabled={generating}
                            >
                                {generating ? (
                                    <>
                                        <FaSpinner className="animate-spin" /> Generating...
                                    </>
                                ) : (
                                    "Generate"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}