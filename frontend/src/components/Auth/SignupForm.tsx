import React, { useState } from "react";
import { signUp } from "../../api/auth";

export const SignupForm: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    const handleSignUp = async () => {
        setLoading(true);
        setStatus("Creating account...");

        try {
            await signUp(username, password, email);
            setStatus("✅ Sign-up successful! Confirm via email.");
        } catch (err) {
            console.error(err);
            setStatus("❌ Sign-up failed. Try again.");
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
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                onClick={handleSignUp}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold transition disabled:opacity-50"
                disabled={loading}
            >
                {loading ? "Signing up..." : "Sign Up"}
            </button>

            {status && <p className="text-sm text-gray-600 text-center">{status}</p>}
        </div>
    );
};
