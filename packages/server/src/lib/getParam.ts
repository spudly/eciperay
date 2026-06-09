import type {Request} from 'express';

/**
 * Safely extracts a route parameter as a string. Express v5 types params as
 * string | string[] but route params are always single strings; this normalises
 * the type to match runtime behaviour.
 */
export const getParam = (req: Request, key: string): string => {
  const val = req.params[key];
  if (Array.isArray(val)) {
    return val[0] ?? '';
  }
  return val ?? '';
};
