import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaPlus, FaMagic, FaBookOpen, FaQuestionCircle, FaTimes } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

// Mock data type (you’ll replace with real fetch from API)
interface Question {
    questionId: string;
    documentId: string;
    tags?: string[];
    question: string;
    choices?: string[];
    answer: string;
    createdAt: string;
}

export default function QuestionsPage() {
    const { documentId } = useParams();
    const { identityId, idToken } = useAuth();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGeneratePopup, setShowGeneratePopup] = useState(false);
    const [generateCount, setGenerateCount] = useState<number>(5);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

    // Simulate fetch
    useEffect(() => {
        async function fetchQuestions() {
            setLoading(true);
            try {
                // TODO: Replace with real fetch
                // const data = await getQuestionsForDocument(documentId, identityId, idToken);
                setQuestions([]); // temp empty
            } catch (error) {
                console.error("Failed to load questions", error);
            } finally {
                setLoading(false);
            }
        }

        if (documentId && identityId && idToken) fetchQuestions();
    }, [documentId, identityId, idToken]);

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Questions</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowGeneratePopup(true)}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                            <FaMagic /> Generate
                        </button>
                        <button
                            onClick={() => alert("Create Question not implemented yet")}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                        >
                            <FaPlus /> Create
                        </button>
                        <button
                            onClick={() => navigate("/explore")}
                            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition"
                        >
                            Back to Explore
                        </button>
                    </div>
                </header>

                <div className="flex gap-3">
                    <button
                        onClick={() => alert("Quiz mode not implemented yet")}
                        className="text-sm bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 flex items-center gap-2"
                    >
                        <FaQuestionCircle /> Quiz
                    </button>

                    <button
                        onClick={() => alert("Study mode not implemented yet")}
                        className="text-sm bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 flex items-center gap-2"
                    >
                        <FaBookOpen /> Study
                    </button>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-md space-y-4">
                    {loading ? (
                        <p className="text-gray-500">Loading questions...</p>
                    ) : questions.length === 0 ? (
                        <p className="text-gray-500">No questions generated yet.</p>
                    ) : (
                        questions.map((q) => (
                            <div
                                key={q.questionId}
                                className="p-4 border rounded-md hover:shadow cursor-pointer"
                                onClick={() => setSelectedQuestion(q)}
                            >
                                <p className="text-gray-800 font-medium truncate">{q.question}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showGeneratePopup && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
                    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4 relative">
                        <h2 className="text-xl font-semibold text-gray-800">Generate Questions</h2>
                        <label className="block text-gray-700 text-sm mb-1">How many questions?</label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={generateCount}
                            onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowGeneratePopup(false)}
                                className="text-gray-600 hover:underline"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert(`Generating ${generateCount} questions (not yet implemented)`);
                                    setShowGeneratePopup(false);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedQuestion && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
                    <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-xl relative space-y-4">
                        <button
                            onClick={() => setSelectedQuestion(null)}
                            className="absolute top-4 right-6 text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes size={20} />
                        </button>
                        <h2 className="text-2xl font-semibold text-gray-800">Question Details</h2>
                        <p className="text-gray-700">{selectedQuestion.question}</p>

                        {selectedQuestion.choices?.length! > 0 && (
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-600">Choices:</p>
                                <ul className="list-disc list-inside">
                                    {selectedQuestion.choices!.map((choice, idx) => (
                                        <li key={idx}>{choice}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="text-sm text-green-700">
                            <strong>Answer:</strong> {selectedQuestion.answer}
                        </p>

                        {selectedQuestion.tags?.length! > 0 && (
                            <p className="text-sm text-gray-500">
                                Tags: {selectedQuestion.tags!.join(", ")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
