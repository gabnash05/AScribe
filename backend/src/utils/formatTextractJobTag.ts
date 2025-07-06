import { createHash } from 'crypto';

// JobTag length needs to be < 65
//
// fix found at:
// https://github.com/boto/boto3/issues/2379
export function formatTextractJobTag(userId: string, documentId: string): string {
    const raw = `${userId}:${documentId}`;
    const hash = createHash('sha256').update(raw).digest('hex').substring(0, 16); // 16 hex chars = 64 bits
    return `doc-${hash}`; // 20 chars total
}