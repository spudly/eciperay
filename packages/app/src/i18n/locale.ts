export const SUPPORTED_LOCALES = ['en-US', 'en-XA'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

const matchSupported = (tag: string): SupportedLocale | null => {
  const normalized = tag.trim().toLowerCase();
  const exact = SUPPORTED_LOCALES.find(
    locale => locale.toLowerCase() === normalized,
  );
  if (exact) {
    return exact;
  }
  const language = normalized.split('-')[0];
  if (language === 'en') {
    return DEFAULT_LOCALE;
  }
  return null;
};

/**
 * Resolve the active locale: a stored user choice wins, then the
 * platform-supplied candidates in order (Accept-Language values on web,
 * device locales on native), then en-US. Catalogs load isomorphically
 * from the compiled modules in this folder, so the same resolution runs
 * on the server during SSR and on the client.
 */
export const resolveLocale = (
  stored: string | null | undefined,
  candidates: readonly string[],
): SupportedLocale => {
  if (stored) {
    const storedMatch = matchSupported(stored);
    if (storedMatch) {
      return storedMatch;
    }
  }
  for (const candidate of candidates) {
    const match = matchSupported(candidate);
    if (match) {
      return match;
    }
  }
  return DEFAULT_LOCALE;
};
