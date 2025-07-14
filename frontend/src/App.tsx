import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DocumentProvider } from "./contexts/DocumentContext";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ScanPage from "./pages/ScanPage";
import ExplorePage from "./pages/ExplorePage";


export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DocumentProvider>
                <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/scan" element={<ScanPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="*" element={<Navigate to="/auth" replace />} />
                </Routes>
                </DocumentProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}