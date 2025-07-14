import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AuthState {
    idToken: string | null;
    identityId: string | null;
    credentials: {
        AccessKeyId: string;
        SecretKey: string;
        SessionToken: string;
    } | null;
}

interface AuthContextType extends AuthState {
    setAuth: (auth: AuthState) => void;
    clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [auth, setAuth] = useState<AuthState>({
        idToken: null,
        identityId: null,
        credentials: null,
    });

    const value = {
        ...auth,
        setAuth: (newAuth: AuthState) => setAuth(newAuth),
        clearAuth: () => setAuth({ idToken: null, identityId: null, credentials: null }),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};