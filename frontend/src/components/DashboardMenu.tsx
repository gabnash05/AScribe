// src/components/DashboardMenu.tsx
import React from "react";
import { FaSearch, FaFileUpload } from "react-icons/fa";

interface DashboardMenuProps {
    onSelectScan: () => void;
    onSelectExplore: () => void;
}

export const DashboardMenu: React.FC<DashboardMenuProps> = ({ onSelectScan, onSelectExplore }) => {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-12">Welcome to AScribe</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <button
                    onClick={onSelectScan}
                    className="w-64 h-64 bg-blue-600 text-white rounded-xl shadow-lg flex flex-col items-center justify-center text-2xl font-semibold hover:bg-blue-700 transition"
                >
                    <FaFileUpload size={48} className="mb-4" />
                    Scan Document
                </button>

                <button
                    onClick={onSelectExplore}
                    className="w-64 h-64 bg-green-600 text-white rounded-xl shadow-lg flex flex-col items-center justify-center text-2xl font-semibold hover:bg-green-700 transition"
                >
                    <FaSearch size={48} className="mb-4" />
                    Explore Documents
                </button>
            </div>
        </div>
    );
};
