import React, { useState } from "react";
import { login, signUp, getAWSCredentials } from "../api/auth";

interface AuthProps {
    onAuthSuccess: (idToken: string, identityId: string, credentials: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [username, setUsername] = useState("gab");
    const [password, setPassword] = useState("ExamplePass123!");
    const [email, setEmail] = useState("nasayaokim@gmail.com");

    const handleLogin = async () => {
        const idToken = await login(username, password);
        const { identityId, credentials } = await getAWSCredentials(idToken!);
        onAuthSuccess(idToken!, identityId!, credentials);
    };

    const handleSignUp = async () => {
        await signUp(username, password, email);
        alert("Sign-up initiated. Confirm via email or AWS Console.");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md space-y-6">
                <h3 className="text-2xl font-semibold text-center text-gray-800">
                    Sign Up / Login
                </h3>

                <div className="flex flex-col space-y-4">
                    <input
                        className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <input
                        className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                <div className="flex justify-between">
                    <button
                        className="w-[48%] bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md"
                        onClick={handleSignUp}
                    >
                        Sign Up
                    </button>
                    <button
                        className="w-[48%] bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
    );
};
