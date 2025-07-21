import { useState } from "react";
import FolderTree from "./FolderTree";
import { FaFolderOpen, FaFolder } from "react-icons/fa";

interface FolderItemProps {
    name: string;
    path: string;
    childrenTree: any;
    onFileSelect: (path: string, documentId: string) => void;
}

export default function FolderItem({
    name,
    path,
    childrenTree,
    onFileSelect,
}: FolderItemProps) {
    const [open, setOpen] = useState(false);

    return (
        <li className="mb-1">
            <div
                onClick={() => setOpen(!open)}
                className="cursor-pointer font-medium hover:bg-gray-200 px-1 py-0.5 rounded"
            >
                {open
                    ? <FaFolderOpen className="mr-2 text-yellow-400" size={40} />
                    : <FaFolder className="mr-2 text-yellow-400" size={40} />}
                <span className="text-1xl">{name}</span>
            </div>

            {open && (
                <FolderTree
                    tree={childrenTree}
                    path={path}
                    onFileSelect={onFileSelect}
                />
            )}
        </li>
    );
}
