import type {Request, Response} from 'express';
import type {ZodError, ZodType} from 'zod';
import {ZodError as ZodErrorClass} from 'zod';

type ValidateResult<T> = {ok: true; data: T} | {ok: false};

export class AiResponseParseError extends Error {
  constructor(cause: unknown) {
    super('AI response validation failed');
    this.name = 'AiResponseParseError';
    this.cause = cause;
  }
}

const sendValidationError = (res: Response, error: ZodError) => {
  res
    .status(400)
    .json({
      error: 'Validation failed',
      issues: error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
};

export const validate = <T>(
  schema: ZodType<T>,
  req: Request,
  res: Response,
): ValidateResult<T> => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    sendValidationError(res, result.error);
    return {ok: false};
  }
  return {ok: true, data: result.data};
};

export const extractJsonFromAiText = (text: string): string => {
  const fenceMatch = /```(?:json)?\s*\n([\s\S]*?)\n```/i.exec(text);
  const fenced = fenceMatch?.[1];
  if (fenced) {
    return fenced.trim();
  }
  return text.trim();
};

export const parseAiJson = <T>(schema: ZodType<T>, text: string): T => {
  try {
    return schema.parse(JSON.parse(extractJsonFromAiText(text)) as unknown);
  } catch (error) {
    if (error instanceof ZodErrorClass || error instanceof SyntaxError) {
      throw new AiResponseParseError(error);
    }
    throw error;
  }
};
