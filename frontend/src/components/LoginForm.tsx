import React, { useState } from "react";
import { login, getAWSCredentials } from "../api/auth";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface Props {
    onAuthSuccess: (idToken: string, identityId: string, credentials: any) => void;
}

export const LoginForm: React.FC<Props> = ({ onAuthSuccess }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    const handleLogin = async () => {
        setLoading(true);
        setStatus("Logging in...");

        try {
            const idToken = await login(username, password);
            const { identityId, credentials } = await getAWSCredentials(idToken!);
            setStatus("✅ Logged in successfully.");
            onAuthSuccess(idToken!, identityId!, credentials);
        } catch (err) {
            console.error(err);
            setStatus(`❌ Login failed. ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />

            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
            </div>

            <button
                onClick={handleLogin}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition disabled:opacity-50"
                disabled={loading}
            >
                {loading ? "Logging in..." : "Login"}
            </button>

            {status && <p className="text-sm text-gray-600 text-center">{status}</p>}
        </div>
    );
};
