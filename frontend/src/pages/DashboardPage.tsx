import { useNavigate } from "react-router-dom";
import { DashboardMenu } from "../components/DashboardMenu";

export default function DashboardPage() {
    const navigate = useNavigate();

    return (
        <DashboardMenu
            onSelectScan={() => navigate("/scan")}
            onSelectExplore={() => navigate("/explore")}
        />
    );
}