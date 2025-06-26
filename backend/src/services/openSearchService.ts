import { HttpRequest } from '@aws-sdk/protocol-http';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

import {
    IndexDocumentParams,
    DeleteDocumentParams,
    SearchDocumentsParams,
    SearchDocumentsResult
} from '../types/opensearch-types';

const region = process.env.AWS_REGION;
const endpoint = process.env.OPENSEARCH_ENDPOINT;

if (!region) {
    throw new Error('AWS_REGION environment variable is required');
}
if (!endpoint) {
    throw new Error('OPENSEARCH_ENDPOINT environment variable is required');
}

const hostname = endpoint.replace(/^https?:\/\//, '');
const indexName = 'documents';

const signer = new SignatureV4({
    service: 'es',
    region,
    credentials: defaultProvider(),
    sha256: Sha256,
});

const client = new NodeHttpHandler();

export async function indexDocumentContent({ id, body }: IndexDocumentParams): Promise<void> {
    try {
        if (!id || !body) {
            throw new Error('Document ID and body are required for indexing');
        }
        
        const request = new HttpRequest({
            method: 'PUT',
            hostname,
            path: `/${indexName}/_doc/${id}`,
            headers: {
                'host': hostname,
                'content-type': 'application/json'
            },
            body: JSON.stringify(body),
        });
    
        await signedFetch(request);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to index document ${id}: ${message}`);
    }
}

export async function deleteDocumentContent({ id }: DeleteDocumentParams): Promise<void> {
    try {
        if (!id) {
            throw new Error('Document ID is required for deletion');
        }

        const request = new HttpRequest({
            method: 'DELETE',
            hostname,
            path: `/${indexName}/_doc/${id}`,
            headers: {
                'host': hostname,
            }
        });
    
        await signedFetch(request);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to delete document ${id}: ${message}`);
    }
}

export async function searchDocuments({ query, userId, from, size }: SearchDocumentsParams): Promise<SearchDocumentsResult> {
    try {
        if (!query || !userId) {
            throw new Error('Query and userId are required for searching documents');
        }

        const request = new HttpRequest({
            method: 'POST',
            hostname,
            path: `/${indexName}/_search`,
            headers: {
                'host': hostname,
                'content-type': 'application/json'
            }, 
            body: JSON.stringify({
                from: from ?? 0,
                size: size ?? 10,
                query: {
                    bool: {
                        must: {
                            multi_match: {
                                query,
                                fields: ['text', 'summary', 'question', 'tags']
                            }
                        },
                        filter: {
                            term: {
                                userId: userId
                            }
                        }
                    }
                }
            }),
        });
    
        const result = await signedFetch(request);
    
        return {
            total: result.hits.total?.value || 0,
            hits: result.hits.hits.map((hit: any) => ({
                id: hit._id,
                ...hit._source
            })),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to search documents: ${message}`);
    }
}

export async function initializeSearchIndex(): Promise<void> {
    try {
        const request = new HttpRequest({
            method: 'PUT',
            hostname,
            path: `/${indexName}`,
            headers: {
                'host': hostname,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 1
                },
                mappings: {
                    properties: {
                        text: { type: 'text' },
                        summary: { type: 'text' },
                        question: { type: 'text' },
                        answer: { type: 'text' },
                        choices: { type: 'keyword' },
                        tags: { type: 'keyword' },
                        userId: { type: 'keyword' },
                        documentId: { type: 'keyword' },
                        originalFilename: { type: 'text' },
                        contentType: { type: 'keyword' }
                    }
                }
            })
        });
    
        await signedFetch(request);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to initialize search index: ${message}`);
    }
}

async function signedFetch(request: HttpRequest) {
    const signed = await signer.sign(request) as HttpRequest;
    const { response } = await client.handle(signed);

    if (!response.statusCode || response.statusCode >= 400) {
        const errorBody = await streamToString(response.body);
        throw new Error(`OpenSearch request failed with status ${response.statusCode}: ${errorBody}`);
    }

    const body = await streamToString(response.body);
    return JSON.parse(body);
}
function streamToString(stream: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
}