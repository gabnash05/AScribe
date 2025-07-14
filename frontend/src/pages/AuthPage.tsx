import { useAuth } from "../contexts/AuthContext";
import { Auth } from "../components/Auth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
    const { idToken, setAuth } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (idToken) {
            navigate("/dashboard");
        }
    }, [idToken, navigate]);

    const handleAuthSuccess = (
        idToken: string,
        identityId: string,
        credentials: any
    ) => {
        setAuth({ idToken, identityId, credentials });
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-gray-100">
        <Auth onAuthSuccess={handleAuthSuccess} />
        </div>
    );
}