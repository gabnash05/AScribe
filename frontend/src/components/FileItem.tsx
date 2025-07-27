import { FaFileAlt } from "react-icons/fa";

interface FileItemProps {
    name: string;
    path: string;
    documentId: string;
    onClick: (path: string, documentId: string) => void;
}

export default function FileItem({ name, path, documentId, onClick }: FileItemProps) {
    return (
        <li
            onClick={() => onClick(path, documentId)}
            className="cursor-pointer hover:bg-gray-100 p-2 rounded flex items-center"
        >
            <FaFileAlt className="mr-2 text-blue-500" size={40} />
            <span className="text-1xl">{name}</span>
        </li>    );
}
