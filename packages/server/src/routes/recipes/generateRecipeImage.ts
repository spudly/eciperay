import type {Response} from 'express';
import Anthropic from '@anthropic-ai/sdk';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import {serializeErrorForLog} from '../../lib/aiServiceDiagnostics.js';
import {generateRecipeImagePrompt} from '../../lib/generateRecipeImagePrompt.js';
import {generateRecipeImageWithOpenAi} from '../../lib/generateRecipeImageWithOpenAi.js';
import {serverLog} from '../../lib/posthogLogs.js';
import {GenerateRecipeImageSchema, validate} from '../../lib/schemas.js';

type QueryFn = typeof defaultQuery;

const isAiConnectionError = (error: unknown): boolean => {
  if (error instanceof Anthropic.APIConnectionError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('premature close') ||
      message.includes('connection error') ||
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('socket hang up')
    );
  }
  return false;
};

export const formatImageGenerationError = (error: unknown): string => {
  if (isAiConnectionError(error) || error instanceof Anthropic.APIError) {
    return 'Image generation is temporarily unavailable. Please try again.';
  }
  if (error instanceof Error) {
    if (error.message.includes('is not configured')) {
      return 'Image generation is unavailable.';
    }
    if (
      error.message === 'Unexpected Claude response' ||
      error.message.startsWith('Image generation failed')
    ) {
      return 'Image generation failed. Please try again.';
    }
  }
  return 'Image generation failed. Please try again.';
};

export const generateRecipeImage = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn = defaultQuery,
) => {
  const body = validate(GenerateRecipeImageSchema, req, res);
  if (!body.ok) {
    return;
  }
  // One quota unit per image generation (covers the Anthropic prompt step +
  // the OpenAI image call) — documented approximation.
  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }
  const startedAt = Date.now();
  serverLog('info', 'Recipe image generation started', {
    ingredientCount: body.data.ingredients.length,
    instructionCount: body.data.instructions.length,
  });

  try {
    const promptStartedAt = Date.now();
    let prompt: string;
    try {
      prompt = await generateRecipeImagePrompt(body.data);
      serverLog('info', 'Recipe image prompt generated', {
        step: 'anthropic_prompt',
        durationMs: Date.now() - promptStartedAt,
        promptLength: prompt.length,
      });
    } catch (error_) {
      serverLog('warn', 'Recipe image prompt generation failed', {
        step: 'anthropic_prompt',
        durationMs: Date.now() - promptStartedAt,
        totalDurationMs: Date.now() - startedAt,
        ...serializeErrorForLog(error_),
      });
      throw error_;
    }

    const imageStartedAt = Date.now();
    let image: {imageBase64: string; contentType: string};
    try {
      image = await generateRecipeImageWithOpenAi(prompt);
      serverLog('info', 'Recipe image generated', {
        step: 'openai_image',
        durationMs: Date.now() - imageStartedAt,
        contentType: image.contentType,
        totalDurationMs: Date.now() - startedAt,
      });
    } catch (error_) {
      serverLog('warn', 'Recipe image rendering failed', {
        step: 'openai_image',
        durationMs: Date.now() - imageStartedAt,
        totalDurationMs: Date.now() - startedAt,
        ...serializeErrorForLog(error_),
      });
      throw error_;
    }

    res.json(image);
  } catch (error_) {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    res.status(502).json({error: formatImageGenerationError(error_)});
  }
};
