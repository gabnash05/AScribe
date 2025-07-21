import { FaFileAlt } from "react-icons/fa";

interface FileItemProps {
    name: string;
    path: string;
    onClick: (path: string) => void;
}

export default function FileItem({ name, path, onClick }: FileItemProps) {
    return (
        <li
            onClick={() => onClick(path)}
            className="cursor-pointer hover:bg-gray-100 p-1 rounded"
        >
            <FaFileAlt className="mr-2 text-blue-500" size={40} />
            <span className="text-1xl">{name}</span>
        </li>
    );
}
