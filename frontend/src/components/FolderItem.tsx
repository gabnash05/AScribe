import { useState, useEffect } from "react";
import FolderTree from "./FolderTree";
import { FaFolderOpen, FaFolder } from "react-icons/fa";

interface FolderItemProps {
    name: string;
    path: string;
    childrenTree: any;
    onFileSelect: (path: string, documentId: string) => void;
    expandedPaths: string[];
}

export default function FolderItem({
    name,
    path,
    childrenTree,
    onFileSelect,
    expandedPaths,
}: FolderItemProps) {
    const [isOpen, setIsOpen] = useState(() => expandedPaths.includes(path));
    
    useEffect(() => {
        setIsOpen(expandedPaths.includes(path));
    }, [expandedPaths, path]);

    return (
        <li className="mb-1">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="cursor-pointer font-medium hover:bg-gray-200 px-1 py-0.5 rounded"
            >
                {isOpen
                    ? <FaFolderOpen className="mr-2 text-yellow-400" size={40} />
                    : <FaFolder className="mr-2 text-yellow-400" size={40} />}
                <span className="text-1xl">{name}</span>
            </div>

            {isOpen && (
                <FolderTree
                    tree={childrenTree}
                    path={path}
                    onFileSelect={onFileSelect}
                />
            )}
        </li>
    );
}
