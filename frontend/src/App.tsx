import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DocumentProvider } from "./contexts/DocumentContext";

import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ScanPage from "./pages/ScanPage";
import ExplorePage from "./pages/ExplorePage";
import QuestionsPage from "./pages/QuestionsPage";
import QuizPage from "./pages/QuizPage";

import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DocumentProvider>
                    <Routes>
                        {/* Public route */}
                        <Route path="/auth" element={<AuthPage />} />

                        {/* Protected routes wrapper */}
                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/scan" element={<ScanPage />} />
                            <Route path="/explore" element={<ExplorePage />} />
                            <Route path="/questions/:documentId" element={<QuestionsPage />} />
                            <Route path="/documents/:documentId/quiz" element={<QuizPage />} />
                        </Route>

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/auth" replace />} />
                    </Routes>
                </DocumentProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}