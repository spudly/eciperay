import type {NextFunction, Request, Response} from 'express';

import {supabase} from '../supabase.js';

export type AuthedRequest = Request & {userId: string};

type VerifyResult = {ok: true; userId: string} | {ok: false; message: string};

const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

const verifyToken = async (token: string): Promise<VerifyResult> => {
  const {data, error} = await supabase.auth.getUser(token);
  if (error ?? !data.user) {
    return {ok: false, message: 'Invalid or expired token'};
  }
  return {ok: true, userId: data.user.id};
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({error: 'Missing authorization token'});
    return;
  }
  const result = await verifyToken(token);
  if (!result.ok) {
    res.status(401).json({error: result.message});
    return;
  }
  (req as AuthedRequest).userId = result.userId;
  next();
};
