import type {Request, Response} from 'express';
import type {z} from 'zod';

type ValidateResult<T> = {ok: true; data: T} | {ok: false};

const sendValidationError = (res: Response, error: z.ZodError) => {
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
  schema: z.ZodType<T>,
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

export const parseAiJson = <T>(schema: z.ZodType<T>, text: string): T =>
  schema.parse(JSON.parse(text) as unknown);

export type Infer<S extends z.ZodType> = z.infer<S>;
