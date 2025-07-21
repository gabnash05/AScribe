import FolderItem from "./FolderItem";
import FileItem from "./FileItem";
import type { FileLeaf } from "../utils/buildFileTree"; // Adjust path as needed

interface FolderTreeProps {
    tree: any;
    path?: string;
    onFileSelect: (path: string, documentId: string) => void;
}

export default function FolderTree({ tree, path = "", onFileSelect }: FolderTreeProps) {
    return (
        <ul className="mx-10">
            {Object.entries(tree).map(([key, value]) => {
                const fullPath = path ? `${path}/${key}` : key;

                if (value && typeof value === "object" && "isFile" in value && value.isFile) {
                    const file = value as FileLeaf;
                    return (
                        <FileItem
                            key={fullPath}
                            name={key}
                            path={fullPath}
                            documentId={file.documentId}
                            onClick={onFileSelect}
                        />
                    );
                } else {
                    return (
                        <FolderItem
                            key={fullPath}
                            name={key}
                            path={fullPath}
                            childrenTree={value}
                            onFileSelect={onFileSelect}
                        />
                    );
                }
            })}
        </ul>
    );
}
