import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

export const generateShareToken = (): string =>
  randomBytes(32).toString('base64url');

export const hashShareToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const verifyShareToken = (
  token: string,
  hash: string | null,
): boolean => {
  if (!hash) {
    return false;
  }

  const tokenHash = hashShareToken(token);

  try {
    return timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(hash, 'hex'),
    );
  } catch {
    return false;
  }
};
