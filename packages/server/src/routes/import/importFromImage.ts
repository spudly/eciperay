import type {Response} from 'express';

import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, SONNET} from '../../lib/anthropic.js';
import {
  ImportImageSchema,
  RecipeImportSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';

const SYSTEM_PROMPT = `You are a recipe OCR parser. Extract the recipe from the image and return
ONLY valid JSON (no markdown):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}`;

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const buildImageMessage = (imageBase64: string, mediaType: MediaType) => ({
  role: 'user' as const,
  content: [
    {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: mediaType,
        data: imageBase64,
      },
    },
  ],
});

const callClaudeVision = (imageBase64: string, mediaType: MediaType) =>
  anthropic.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [buildImageMessage(imageBase64, mediaType)],
  });

const extractText = (
  content: {type: string; text?: string} | undefined,
): string => {
  if (content?.type !== 'text' || !content.text) {
    throw new Error('Unexpected Claude response type');
  }
  return content.text;
};

export const importFromImage = async (req: AuthedRequest, res: Response) => {
  const body = validate(ImportImageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {imageBase64, mediaType = 'image/jpeg'} = body.data;
  const message = await callClaudeVision(imageBase64, mediaType);
  const text = extractText(message.content[0]);
  res.json(parseAiJson(RecipeImportSchema, text));
};
