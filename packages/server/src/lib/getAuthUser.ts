import type {Request} from 'express';
import type {User} from '@supabase/supabase-js';

import {supabase} from '../supabase.js';

export const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

export const getAuthUserFromRequest = async (
  req: Request,
): Promise<User | null> => {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }
  const {data, error} = await supabase.auth.getUser(token);
  if (error ?? !data.user) {
    return null;
  }
  return data.user;
};
