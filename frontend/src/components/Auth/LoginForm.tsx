import React, { useState } from "react";
import { login, getAWSCredentials } from "../../api/auth";

interface Props {
    onAuthSuccess: (idToken: string, identityId: string, credentials: any) => void;
}

export const LoginForm: React.FC<Props> = ({ onAuthSuccess }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
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
            setStatus("❌ Login failed. Check your credentials.");
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
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />

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
