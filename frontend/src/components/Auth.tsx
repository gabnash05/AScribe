import React, { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

interface AuthProps {
    onAuthSuccess: (idToken: string, identityId: string, credentials: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [mode, setMode] = useState<"login" | "signup">("login");

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Left 1/3 Column – Form */}
            <div className="w-full md:w-1/3 flex items-center justify-center bg-white px-10 py-12 shadow-md">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
                        {mode === "login" ? "Log In" : "Sign Up"}
                    </h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        {mode === "login"
                            ? "Access your AScribe account"
                            : "Create a new AScribe account"}
                    </p>

                    {mode === "login" ? (
                        <LoginForm onAuthSuccess={onAuthSuccess} />
                    ) : (
                        <SignupForm />
                    )}

                    <div className="text-center text-sm text-gray-600 mt-4">
                        {mode === "login" ? (
                            <>
                                Don’t have an account?{" "}
                                <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => setMode("signup")}
                                >
                                    Sign Up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button
                                    className="text-blue-600 hover:underline"
                                    onClick={() => setMode("login")}
                                >
                                    Log In
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right 2/3 Column – Graphic/Illustration */}
            <div className="w-full md:w-2/3 bg-gray-100 flex items-center justify-center p-10">
                <div className="text-center text-gray-500">
                    {/* Placeholder for graphic, or replace with an <img> */}
                    <div className="w-full max-w-md h-80 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-sm">Your illustration or artwork here</span>
                    </div>
                </div>
            </div>
        </div>
    );
};