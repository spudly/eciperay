import type {Request} from 'express';

export const getShareTokenFromQuery = (req: Request): string | undefined => {
  const token = req.query['t'];
  if (typeof token === 'string' && token.length > 0) {
    return token;
  }
  if (
    Array.isArray(token) &&
    typeof token[0] === 'string' &&
    token[0].length > 0
  ) {
    return token[0];
  }
  return undefined;
};
