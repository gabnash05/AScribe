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

const region = process.env.AWS_REGION!;
const endpoint = process.env.OPENSEARCH_ENDPOINT!;
const indexName = 'documents';

const signer = new SignatureV4({
    service: 'es',
    region,
    credentials: defaultProvider(),
    sha256: Sha256,
});

const client = new NodeHttpHandler();

export async function indexDocumentContent({ id, body }: IndexDocumentParams): Promise<void> {
    const request = new HttpRequest({
        method: 'PUT',
        hostname: endpoint.replace(/^https?:\/\//, ''),
        path: `/${indexName}/_doc/${id}`,
        headers: {
            'host': endpoint.replace(/^https?:\/\//, ''),
            'content-type': 'application/json'
        },
        body: JSON.stringify(body),
    });

    await signedFetch(request);
}

export async function deleteDocumentContent({ id }: DeleteDocumentParams): Promise<void> {
    const request = new HttpRequest({
        method: 'DELETE',
        hostname: endpoint.replace(/^https?:\/\//, ''),
        path: `/${indexName}/_doc/${id}`,
        headers: {
            'host': endpoint.replace(/^https?:\/\//, '')
        }
    });

    await signedFetch(request);
}

export async function searchDocuments({ query, userId }: SearchDocumentsParams): Promise<SearchDocumentsResult> {
    const request = new HttpRequest({
        method: 'POST',
        hostname: endpoint.replace(/^https?:\/\//, ''),
        path: `/${indexName}/_search`,
        headers: {
            'host': endpoint.replace(/^https?:\/\//, ''),
            'content-type': 'application/json'
        },
        body: JSON.stringify({
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
        }))
    };
}

export async function initializeSearchIndex(): Promise<void> {
    const request = new HttpRequest({
        method: 'PUT',
        hostname: endpoint.replace(/^https?:\/\//, ''),
        path: `/${indexName}`,
        headers: {
            'host': endpoint.replace(/^https?:\/\//, ''),
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
}

async function signedFetch(request: HttpRequest) {
    const signed = await signer.sign(request) as HttpRequest;
    const { response } = await client.handle(signed);
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