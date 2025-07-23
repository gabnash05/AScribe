import { useState } from "react";
import { FaTimes, FaEdit, FaTrash } from "react-icons/fa";

interface Question {
    questionId: string;
    documentId: string;
    tags?: string[];
    question: string;
    choices?: string[];
    answer: string;
    createdAt: string;
}

interface Props {
    question: Question;
}

export default function QuestionCard({ question }: Props) {
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedQuestion, setEditedQuestion] = useState<Question>({
        ...question,
        choices: Array.isArray(question.choices) ? question.choices : [],
        tags: Array.isArray(question.tags) ? question.tags : [],
    });

    return (
        <>
            <div
                onClick={() => setOpen(true)}
                className="p-4 border rounded-md hover:shadow cursor-pointer bg-white"
            >
                <p className="text-gray-800 font-medium truncate">{question.question}</p>
            </div>

            {open && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl relative space-y-4">
                        <button
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-6 text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes size={20} />
                        </button>

                        {/* Tags - now safe since we initialized with empty array */}
                        {editedQuestion.tags!.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-2">
                                {editedQuestion.tags!.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Question */}
                        <textarea
                            disabled={!isEditing}
                            value={editedQuestion.question}
                            onChange={(e) =>
                                setEditedQuestion({ ...editedQuestion, question: e.target.value })
                            }
                            className={`w-full flex text-center text-3xl font-bold resize-none justify-center items-center bg-transparent focus:outline-none border ${
                                isEditing
                                    ? "border-gray-300 focus:ring-2 focus:ring-blue-300"
                                    : "border-transparent"
                            } rounded-md p-6 transition my-4`}
                        />
                        
                        {/* Choices - now safe with default empty array */}
                        <div className="flex gap-1 justify-center mb-1">
                            {editedQuestion.choices!.map((choice, idx) => (
                                <textarea
                                    key={idx}
                                    disabled={!isEditing}
                                    value={choice}
                                    onChange={(e) => {
                                        const updated = Array.isArray(editedQuestion.choices) ? [...editedQuestion.choices] : [];
                                        updated[idx] = e.target.value;
                                        setEditedQuestion({ ...editedQuestion, choices: updated });
                                    }}
                                    className={`text-center text-lg max-w-44 w-auto bg-gray-100 resize-none focus:outline-none border ${
                                        isEditing
                                            ? "border-gray-300 focus:ring-2 focus:ring-blue-300"
                                            : "border-transparent"
                                    } rounded px-1 p-5 transition`}
                                    style={{ width: 'auto', minWidth: '20px' }}
                                />
                            ))}
                        </div>

                        {/* Answer */}
                        <textarea
                            rows={1}
                            disabled={!isEditing}
                            value={editedQuestion.answer}
                            onChange={(e) => setEditedQuestion({ ...editedQuestion, answer: e.target.value })}
                            className={`w-full text-center text-xl text-green-700 bg-gray-100 font-bold resize-none focus:outline-none border ${
                                isEditing ? "border-gray-300 focus:ring-2 focus:ring-blue-300" : "border-transparent"
                            } rounded-md p-5 transition mb-2`}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-300">
                            <button
                                onClick={() => setIsEditing((prev) => !prev)}
                                className="flex items-center gap-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded"
                            >
                                <FaEdit /> {isEditing ? "Done" : "Edit"}
                            </button>
                            <button
                                onClick={() => alert("Delete functionality coming soon.")}
                                className="flex items-center gap-1 text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                            >
                                <FaTrash /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}