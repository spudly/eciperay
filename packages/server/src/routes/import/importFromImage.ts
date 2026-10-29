import type {Response} from 'express';
import type {z} from 'zod';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {anthropic, SONNET} from '../../lib/anthropic.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {saveNewRecipeFromInput} from '../../lib/saveRecipeFromInput.js';
import {
  ImportImageSchema,
  RecipeImportSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';
import {respondIfDuplicateImport} from './respondIfDuplicateImport.js';

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
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ImportImageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const {imageBase64, mediaType = 'image/jpeg'} = body.data;
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  let parsed: z.infer<typeof RecipeImportSchema>;
  try {
    const message = await callClaudeVision(imageBase64, mediaType);
    // Extraction and parsing are inside the refunded scope: a successful
    // transport carrying a non-text block or malformed JSON must not burn
    // quota.
    const text = extractText(message.content[0]);
    parsed = parseAiJson(RecipeImportSchema, text);
  } catch (error) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    throw error;
  }
  try {
    const input = await prepareImportedRecipeInput({
      recipe: {...parsed, sourceUrl: parsed.sourceUrl ?? null},
      userId: req.userId,
      queryFn,
    });
    // Duplicate warning (#296), same as the text import path.
    if (
      await respondIfDuplicateImport(res, {
        userId: req.userId,
        input,
        allowDuplicate: body.data.allowDuplicate,
        queryFn,
      })
    ) {
      return;
    }
    const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
      {userId: req.userId, input, createdVia: 'import_image'},
      queryFn,
    );
    res.status(201).json({...recipe, recipeId, versionId});
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }
};
