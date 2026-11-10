import {z} from 'zod';

export const AUTH_EMAIL_ERROR_MESSAGE = 'Enter a valid email address';

// The pattern is zod's RFC 5322 email regex rather than its default:
// the default rejects valid local parts containing characters such as
// `%` (e.g. user%tag@example.com) that mail providers accept, and those
// addresses must not be blocked before the auth call.
export const authEmailSchema = z.email({
  pattern: z.regexes.rfc5322Email,
  message: AUTH_EMAIL_ERROR_MESSAGE,
});

/**
 * Returns the user-facing validation message when `email` is not a valid email
 * address, or `null` when it is. The check runs on the trimmed value; what
 * callers submit to auth is unchanged.
 */
export const validateAuthEmail = (email: string): string | null => {
  const result = authEmailSchema.safeParse(email.trim());
  return result.success ? null : AUTH_EMAIL_ERROR_MESSAGE;
};
