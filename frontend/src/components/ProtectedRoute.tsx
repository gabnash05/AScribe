// Design from
// https://medium.com/@dennisivy/creating-protected-routes-with-react-router-v6-2c4bbaf7bc1c

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = () => {
    const { idToken } = useAuth();

    return (
        idToken ? <Outlet/> : <Navigate to='/auth'/>
    )
};
