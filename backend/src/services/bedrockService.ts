import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelCommandInput,
    BedrockRuntimeServiceException
} from '@aws-sdk/client-bedrock-runtime';

import { 
    CleanExtractedTextWithBedrockParams, 
    CleanExtractedTextWithBedrockResult, 
    GenerateSummaryParams,
    GenerateSummaryResult,
    GenerateQuestionParams,
    GenerateQuestionResult,
    QuestionItem
} from '../types/bedrock-types'

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
                temperature: 0.3, // Low creativity for cleanup tasks
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

export async function generateSummary({
    modelId,
    cleanedText,
}: GenerateSummaryParams): Promise<GenerateSummaryResult> {
    try {
        if (!cleanedText || cleanedText.trim().length === 0) {
            throw new Error('Cleaned text is required for summary generation');
        }

        const prompt = buildSummaryPrompt(cleanedText);

        const command = new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: Buffer.from(JSON.stringify({
                prompt,
                max_tokens_to_sample: 1024,
                temperature: 0.5, // Moderate creativity
                stop_sequences: ['</response>']
            }))
        });

        const response = await bedrockClient.send(command);
        const decoded = JSON.parse(new TextDecoder().decode(response.body));

        return {
            summary: (decoded.completion || '').trim()
        };
    } catch (error) {
        if (error instanceof BedrockRuntimeServiceException) {
            throw new Error(`Failed to generate summary: ${error.message}`);
        }
        throw new Error(`Unexpected error during summary generation: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
}

export async function generateQuestion({
    modelId,
    cleanedText,
    questionCount
}: GenerateQuestionParams): Promise<GenerateQuestionResult> {
    try {
        if (!cleanedText || cleanedText.trim().length === 0) {
            throw new Error('Cleaned text is required for question generation');
        }

        if (questionCount <= 0) {
            throw new Error('Number of questions must be greater than zero');
        }

        const prompt = buildQuestionsPrompt(cleanedText, questionCount);

        const command = new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: Buffer.from(JSON.stringify({
                prompt,
                max_tokens_to_sample: 2048,
                temperature: 0.7,   // Moderate creativity for question generation
                stop_sequences: ['</response>']
            }))
        });

        const response = await bedrockClient.send(command);
        const decoded = JSON.parse(new TextDecoder().decode(response.body));
        const completionText = decoded.completion || '';

        // Improved JSON extraction
        const jsonMatch = completionText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No JSON array found in response');
        }

        let questions: QuestionItem[] = JSON.parse(jsonMatch[0]); 

        // Validate each question
        if (!Array.isArray(questions)) {
            throw new Error('Generated questions are not in an array format');
        }

        const validatedQuestions: QuestionItem[] = [];
        for (const q of questions) {
            try {
                // Validate question structure
                 if (typeof q !== 'object' || q === null) {
                    console.warn('Skipping invalid question format');
                    continue;
                }

                const validatedQuestion: QuestionItem = {
                    tags: Array.isArray(q.tags)
                        ? q.tags.filter((tag: unknown) => typeof tag === 'string')
                              .map((tag: string) => tag.trim())
                        : [],
                    question: typeof q.question === 'string' ? q.question.trim() : '',
                    answer: typeof q.answer === 'string' ? q.answer.trim() : '',
                    choices: Array.isArray(q.choices)
                        ? q.choices.filter((choice: unknown) => typeof choice === 'string')
                                  .map((choice: string) => choice.trim())
                        : []
                };

                // Basic content validation
                if (!validatedQuestion.question || !validatedQuestion.answer || validatedQuestion.choices.length < 2) {
                    console.warn('Skipping incomplete question');
                    continue;
                }

                // Ensure answer is in choices
                if (!validatedQuestion.choices.includes(validatedQuestion.answer)) {
                    validatedQuestion.choices.push(validatedQuestion.answer);
                }

                validatedQuestions.push(validatedQuestion);
            } catch (questionError) {
                console.warn('Error validating question:', questionError);
            }
        }

        if (validatedQuestions.length === 0) {
            throw new Error('No valid questions were generated');
        }

        return { questions: validatedQuestions };
    } catch (error) {
        if (error instanceof BedrockRuntimeServiceException) {
            throw new Error(`Failed to generate questions: ${error.message}`);
        }
        throw new Error(`Unexpected error during question generation: ${
            error instanceof Error ? error.message : 'Unknown error'
        }`);
    }
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

function buildSummaryPrompt(cleanedText: string): string {
    return `
You are a helpful AI assistant for a study notes app. Your task is to generate a clear and concise academic summary of the following document.

Guidelines:
- Audience: high school or college students reviewing their notes.
- Tone: neutral, informative, and study-friendly.
- Content: use only the provided information. Do not add or assume anything.
- Format: The total length should be proportional to the input. Keep paragraphs concise and informativev (totaling 100–300 words).
- Focus: explain the key ideas and topics covered.

Document:
"""
${cleanedText}
"""
</response>`;
}

export function buildQuestionsPrompt(cleanedText: string, numQuestions: number): string {
    return `
You are a knowledgeable educational assistant tasked with generating exactly ${numQuestions} high-quality, non-repetitive review questions based on the following cleaned notes. Each question should test important concepts, be clear and concise, and cover different aspects of the material.

For each question, provide a JSON object with these fields:

{
  "tags": ["tag1", "tag2", "tag3"],  // Include 3 to 5 relevant, specific topic tags
  "question": "The question text",   // Clear, unambiguous question
  "answer": "The correct answer",    // Accurate and concise
  "choices": ["choice1", "choice2", "choice3", "choice4"]  // Multiple choice options including the correct answer, plausible distractors
}

Do not repeat questions or answers. Avoid trivial or overly similar questions.

Here is the cleaned source text:
"""
${cleanedText}
"""

Return a valid JSON array of question objects only, with no additional commentary or explanation.
</response>`;
}

function parseBedrockCleanupResponse(responseText: string): CleanExtractedTextWithBedrockResult {
    try {
        // Trim and normalize the response text first
        const normalizedText = responseText.trim();
        
        // More robust JSON extraction that handles common LLM response patterns
        const jsonMatch = normalizedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }

        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate the parsed structure
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Invalid response format - expected object');
        }

        // Ensure cleanedText exists and is a string
        const cleanedText = typeof parsed.cleanedText === 'string' 
            ? parsed.cleanedText.trim() 
            : '';

        // Validate tags array
        const tags = Array.isArray(parsed.tags)
            ? parsed.tags.filter((tag: unknown) => typeof tag === 'string').map((tag: string) => tag.trim())
            : [];

        // Check file path (support both suggestedFilePath and filePath for backward compatibility)
        const suggestedFilePath = parsed.suggestedFilePath;

        return {
            cleanedText,
            tags,
            suggestedFilePath
        };
    } catch (error) {
        throw new Error(`Failed to parse Bedrock cleanup response: ${
            error instanceof Error ? error.message : 'Invalid response format'
        }\nResponse received: ${responseText.slice(0, 200)}...`);
    }
}