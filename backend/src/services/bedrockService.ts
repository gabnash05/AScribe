import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelCommandInput,
    BedrockRuntimeServiceException
} from '@aws-sdk/client-bedrock-runtime';

import { CleanExtractedTextWithBedrockParams, CleanExtractedTextWithBedrockResult } from '../types/bedrock-types'

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION })

export async function cleanExtractedTextWithBedrock({ 
    modelId, 
    extractedText,
    currentFilePaths,
    averageConfidence
}: CleanExtractedTextWithBedrockParams): Promise<CleanExtractedTextWithBedrockResult> {
    try {
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('Extracted text is required for cleanup');
        }

        const prompt = buildCleanupPrompt(extractedText, currentFilePaths, averageConfidence);

        const input: InvokeModelCommandInput = {
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: Buffer.from(JSON.stringify({
                prompt,
                max_tokens_to_sample: 2048,
                temperature: 0.3,   
                top_k: 250,
                stop_sequences: ['</response>']
            }))
        };

        const command = new InvokeModelCommand(input);
        const response = await bedrockClient.send(command);

        const decoded = JSON.parse(new TextDecoder().decode(response.body));

        return parseBedrockCleanupResponse(decoded.completion || '');
    } catch (error) {
        if (error instanceof BedrockRuntimeServiceException) {
            throw new Error(`Failed to invoke Bedrock model: ${error.message}`);
        }
        throw new Error(`Unexpected error during Bedrock invocation: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function generateSummary() {

}

export async function generateQuestion() {
    
}

// ---------------------------
// Internal Helper Functions
// ---------------------------

function buildCleanupPrompt(text: string, currentFilePaths: string[], averageConfidence: number): string {
    return `
You are an assistant helping students organize digitized notes from OCR. Given the raw OCR text extracted from a document, your task is to:

1. Fix formatting and grammar.
2. Correct spelling errors **only if the average OCR confidence rating suggests the text is reliable (e.g., ≥85%)**. If the average confidence is lower, be cautious: only correct obvious spelling errors and avoid guessing unclear words. You may preserve uncertain words as-is or flag them (e.g., with [brackets]).
3. Organize the content into a clean, readable structure that preserves the original layout as much as possible.
4. Generate 4–6 relevant topic tags. Tags should describe the subject, topic, academic level, and document type (e.g., biology, photosynthesis, grade 11, review).
5. Suggest a descriptive file path based on the topic and content.
    - If the content fits into an existing path, reuse that path.
    - If the topic is new, create a clean, concise new path.

Use the average confidence rating to guide how conservatively or aggressively you apply corrections:
- **High confidence (≥90%)**: Clean freely, fix grammar and spelling normally.
- **Moderate confidence (80–89%)**: Fix clear errors, but avoid rewording or interpreting ambiguous phrases.
- **Low confidence (<80%)**: Be minimal in changes, and avoid any assumptions about unclear text.

Do not invent or assume content. Only organize and clean what's present.

Return a JSON response in the following format:

{
  "cleanedText": "<Cleaned content>",
  "tags": ["tag1", "tag2", ...],
  "suggestedFilePath": "subject/term/filename"
}

Current File Paths:
${currentFilePaths.map(path => `- ${path}`).join('\n')}

Average Confidence: ${averageConfidence}%

Raw Text:
"""
${text}
"""
</response>`;
}

function parseBedrockCleanupResponse(responseText: string): CleanExtractedTextWithBedrockResult {
    try {
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}') + 1;
        const jsonStr = responseText.slice(jsonStart, jsonEnd);
        const parsed = JSON.parse(jsonStr);

        return {
            cleanedText: parsed.cleanedText || '',
            tags: Array.isArray(parsed.tags) ? parsed.tags : [],
            filePath: parsed.suggestedFilePath || ''
        };
    } catch {
        throw new Error('Failed to parse Bedrock cleanup response');
    }
}