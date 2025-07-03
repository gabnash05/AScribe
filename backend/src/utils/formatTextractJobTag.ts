export default function formatTextractJobTag(userId: string, documentId: string): string {
    return `document||${userId}||${documentId}`;
}