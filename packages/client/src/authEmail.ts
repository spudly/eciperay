import {z} from 'zod';

export const AUTH_EMAIL_ERROR_MESSAGE = 'Enter a valid email address';

export const authEmailSchema = z.email(AUTH_EMAIL_ERROR_MESSAGE);

/**
 * Returns the user-facing validation message when `email` is not a valid email
 * address, or `null` when it is. The check runs on the trimmed value; what
 * callers submit to auth is unchanged.
 */
export const validateAuthEmail = (email: string): string | null => {
  const result = authEmailSchema.safeParse(email.trim());
  return result.success ? null : AUTH_EMAIL_ERROR_MESSAGE;
};
