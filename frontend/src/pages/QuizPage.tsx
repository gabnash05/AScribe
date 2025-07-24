import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FaCheck, FaTimes, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { getDocumentQuestions } from '../api/questions';
import type { Question } from '../api/questions';

interface Answer {
    selectedChoice: string | null;
    isSubmitted: boolean;
    showFeedback: boolean;
}

type QuizState = {
    questions: Question[];
    currentQuestionIndex: number;
    answers: Record<string, Answer>;
    status: 'loading' | 'active' | 'completed';
    score: {
        correct: number;
        incorrect: number;
    };
};

export default function QuizPage() {
    const { identityId, idToken } = useAuth();
    const { documentId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [quizState, setQuizState] = useState<QuizState>({
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        status: 'loading',
        score: { correct: 0, incorrect: 0 }
    });

    // Load questions on mount
    useEffect(() => {
        const loadQuestions = async () => {
            try {
                if (!documentId || !identityId || !idToken) {
                    throw new Error("Missing required parameters");
                }

                const questions = await getDocumentQuestions(identityId, documentId, idToken);

                const initialAnswers: Record<string, Answer> = {};
                questions.forEach(question => {
                    initialAnswers[question.questionId] = {
                        selectedChoice: null,
                        isSubmitted: false,
                        showFeedback: false
                    };
                });

                setQuizState({
                    questions,
                    currentQuestionIndex: 0,
                    answers: initialAnswers,
                    status: questions.length ? 'active' : 'completed',
                    score: { correct: 0, incorrect: 0 }
                });

            } catch (error) {
                console.error('Failed to load questions:', error);
                navigate('/');
            }
        };

        loadQuestions();
    }, [documentId, navigate, location.state]);

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const currentAnswer = currentQuestion ? quizState.answers[currentQuestion.questionId] : null;
    const isLastQuestion = quizState.currentQuestionIndex === quizState.questions.length - 1;

    const handleSelectChoice = (choice: string) => {
        if (!currentQuestion) return;

        setQuizState(prev => ({
            ...prev,
            answers: {
                ...prev.answers,
                [currentQuestion.questionId]: {
                    ...prev.answers[currentQuestion.questionId],
                    selectedChoice: choice
                }
            }
        }));
    };

    const handleSubmitAnswer = () => {
        if (!currentQuestion || !currentAnswer?.selectedChoice) return;

        const isCorrect = currentAnswer.selectedChoice === currentQuestion.answer;

        setQuizState(prev => ({
            ...prev,
            answers: {
                ...prev.answers,
                [currentQuestion.questionId]: {
                    ...prev.answers[currentQuestion.questionId],
                    isSubmitted: true,
                    showFeedback: true
                }
            },
            score: {
                correct: isCorrect ? prev.score.correct + 1 : prev.score.correct,
                incorrect: isCorrect ? prev.score.incorrect : prev.score.incorrect + 1
            }
        }));
    };

    const handleNextQuestion = () => {
        if (isLastQuestion) {
            setQuizState(prev => ({ ...prev, status: 'completed' }));
        } else {
            const nextIndex = quizState.currentQuestionIndex + 1;
            const nextQuestion = quizState.questions[nextIndex];
            
            setQuizState(prev => {
                // Only initialize if question hasn't been answered yet
                const shouldInitialize = !prev.answers[nextQuestion.questionId];
                
                return {
                    ...prev,
                    currentQuestionIndex: nextIndex,
                    answers: shouldInitialize ? {
                        ...prev.answers,
                        [nextQuestion.questionId]: {
                            selectedChoice: null,
                            isSubmitted: false,
                            showFeedback: false
                        }
                    } : prev.answers
                };
            });
        }
    };

    const handlePreviousQuestion = () => {
        setQuizState(prev => ({
            ...prev,
            currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1)
        }));
    };

    const handleRestartQuiz = () => {
        const initialAnswers = quizState.questions.reduce((acc, question) => {
            acc[question.questionId] = {
                selectedChoice: null,
                isSubmitted: false,
                showFeedback: false
            };
            return acc;
        }, {} as Record<string, Answer>);

        setQuizState({
            ...quizState,
            currentQuestionIndex: 0,
            answers: initialAnswers,
            status: 'active',
            score: { correct: 0, incorrect: 0 }
        });
    };

    const renderChoice = (choice: string, index: number) => {
        if (!currentQuestion || !currentAnswer) return null;

        const isSelected = currentAnswer.selectedChoice === choice;
        const isCorrect = choice === currentQuestion.answer;
        const showFeedback = currentAnswer.showFeedback;
        const isSubmitted = currentAnswer.isSubmitted;

        let choiceClasses = "p-4 border rounded-lg text-left transition-colors";
        let icon = null;

        if (showFeedback && isSubmitted) {
            if (isSelected) {
                // Selected choice after submission
                if (isCorrect) {
                    choiceClasses += " bg-green-100 border-green-500";
                    icon = <FaCheck className="text-green-600" />;
                } else {
                    choiceClasses += " bg-red-100 border-red-500";
                    icon = <FaTimes className="text-red-600" />;
                }
            } else if (isCorrect) {
                // Correct answer but not selected
                choiceClasses += " bg-green-100 border-green-500";
                // No icon here
            } else {
                // Unselected and incorrect
                choiceClasses += " bg-white border-gray-200";
            }
        } else if (isSelected) {
            // Selected but not submitted yet
            choiceClasses += " bg-gray-100 border-gray-400";
        } else {
            // Default state
            choiceClasses += " bg-white hover:bg-gray-50 border-gray-200";
        }

        return (
            <button
                key={index}
                onClick={() => handleSelectChoice(choice)}
                disabled={isSubmitted && showFeedback}
                className={`${choiceClasses} flex justify-between items-center`}
            >
                <span>{choice}</span>
                {icon}
            </button>
        );
    };

    if (quizState.status === 'loading') {
        return <div className="p-8 text-center">Loading quiz...</div>;
    }

    if (quizState.status === 'completed') {
        return (
            <div className="max-w-md mx-auto my-20 p-6 bg-white rounded-lg shadow">
                <h2 className="text-2xl font-bold mb-4">Quiz Completed!</h2>
                <p className="text-lg mb-6">
                    Score: {quizState.score.correct} / {quizState.questions.length}
                </p>
                <button
                    onClick={handleRestartQuiz}
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Restart Quiz
                </button>
            </div>
        );
    }

    if (!currentQuestion) {
        return <div className="p-8 text-center">No questions available</div>;
    }

    return (
        <div className="max-w-2xl my-20 mx-auto p-6 bg-white rounded-lg shadow relative">
            {/* Exit Button */}
            <button
                onClick={() => navigate('/explore', { 
                    state: { 
                        filePath: location.state?.filePath,
                        documentId: location.state?.documentId 
                    } 
                })}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Exit quiz"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="my-8 flex justify-between items-center">
                <span className="text-gray-500">
                    Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
                </span>
                <span className="font-medium">
                    Score: {quizState.score.correct} / {quizState.questions.length}
                </span>
            </div>

            <h3 className="text-xl font-semibold mb-6">{currentQuestion.question}</h3>

            <div className="grid grid-cols-1 gap-3 mb-8">
                {currentQuestion.choices!.map((choice, index) => renderChoice(choice, index))}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={handlePreviousQuestion}
                    disabled={quizState.currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded disabled:opacity-50"
                >
                    <FaArrowLeft /> Previous
                </button>

                {currentAnswer?.isSubmitted ? (
                    <button
                        onClick={handleNextQuestion}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        {isLastQuestion ? 'Finish' : 'Next'} <FaArrowRight />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmitAnswer}
                        disabled={!currentAnswer?.selectedChoice}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        Submit Answer
                    </button>
                )}
            </div>
        </div>
    );
}