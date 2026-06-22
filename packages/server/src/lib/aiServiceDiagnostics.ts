import Anthropic from '@anthropic-ai/sdk';

export const serializeErrorForLog = (
  error: unknown,
): Record<string, string | number | boolean> => {
  if (error instanceof Anthropic.APIConnectionError) {
    const attrs: Record<string, string | number | boolean> = {
      errorType: 'Anthropic.APIConnectionError',
      message: error.message,
    };
    if (error.cause instanceof Error) {
      attrs['causeType'] = error.cause.name;
      attrs['causeMessage'] = error.cause.message;
    }
    return attrs;
  }
  if (error instanceof Anthropic.APIError) {
    return {
      errorType: 'Anthropic.APIError',
      status: typeof error.status === 'number' ? error.status : 0,
      message: error.message,
      ...(error.request_id ? {requestId: error.request_id} : {}),
    };
  }
  if (error instanceof Error) {
    const attrs: Record<string, string | number | boolean> = {
      errorType: error.name || 'Error',
      message: error.message,
    };
    if (error.stack) {
      attrs['stack'] = error.stack;
    }
    if (error.cause instanceof Error) {
      attrs['causeType'] = error.cause.name;
      attrs['causeMessage'] = error.cause.message;
    }
    return attrs;
  }
  return {errorType: typeof error, message: String(error)};
};
