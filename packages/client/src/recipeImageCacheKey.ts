export const withImageCacheKey = (url: string, cacheKey: number): string => {
  const parsed = new URL(url);
  parsed.searchParams.set('v', String(cacheKey));
  return parsed.toString();
};

export const stripImageCacheKey = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('v');
    return parsed.toString();
  } catch {
    return url;
  }
};
