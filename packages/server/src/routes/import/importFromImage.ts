import type {Response} from 'express';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, SONNET} from '../../lib/anthropic.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {
  ImportImageSchema,
  RecipeImportSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

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
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text' || !content.text) {
    throw new Error('Unexpected Claude response type');
  }
  return content.text;
};

export const importFromImage = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportImageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {imageBase64, mediaType = 'image/jpeg'} = body.data;
  const message = await callClaudeVision(imageBase64, mediaType);
  const text = extractText(message.content[0]);
  const parsed = parseAiJson(RecipeImportSchema, text);
  try {
    const input = await prepareImportedRecipeInput({
      recipe: {...parsed, sourceUrl: parsed.sourceUrl ?? null},
      userId: req.userId,
      queryFn,
    });
    const detail = await saveRecipeFromInput(
      {userId: req.userId, input},
      queryFn,
    );
    res.status(201).json(detail);
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};
