export interface FileNode {
    [key: string]: FileNode | FileLeaf;
}

export interface FileLeaf {
    filePath: string;
    documentId: string;
    isFile: true;
}

// Helper to build a nested file tree
export function buildFileTree(entries: { filePath: string; documentId: string }[]): FileNode {
    const root: FileNode = {};

    for (const { filePath, documentId } of entries) {
        const parts = filePath.split('/');
        let current: FileNode = root;

        parts.forEach((part, index) => {
            const isLast = index === parts.length - 1;

            if (isLast) {
                current[part] = {
                    filePath,
                    documentId,
                    isFile: true,
                };
            } else {

                if (
                    !current[part] ||
                    typeof current[part] !== 'object' ||
                    (current[part] as FileLeaf).isFile
                ) {
                    current[part] = {};
                }
                current = current[part] as FileNode;
            }
        });
    }

    return root;
}
