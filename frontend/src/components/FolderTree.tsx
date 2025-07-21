import FolderItem from "./FolderItem";
import FileItem from "./FileItem";

interface FolderTreeProps {
    tree: any;
    path?: string;
    onFileSelect: (path: string) => void;
}

export default function FolderTree({ tree, path = "", onFileSelect }: FolderTreeProps) {
    return (
        <ul className="mx-10">
            {Object.entries(tree).map(([key, value]) => {
                const fullPath = path ? `${path}/${key}` : key;
                if (value === null) {
                    return (
                        <FileItem
                            key={fullPath}
                            name={key}
                            path={fullPath}
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
