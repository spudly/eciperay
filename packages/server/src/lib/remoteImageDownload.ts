const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type FetchFn = typeof fetch;

export const downloadRemoteImage = async (
  url: string,
  fetchFn: FetchFn,
): Promise<{buffer: Buffer; contentType: string} | null> => {
  try {
    const response = await fetchFn(url, {
      headers: {'User-Agent': 'Recipoo/1.0'},
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim();
    if (!contentType?.startsWith('image/')) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return null;
    }
    return {buffer, contentType};
  } catch {
    return null;
  }
};

export const fetchImageAsBase64 = async (
  url: string,
  fetchFn: FetchFn = fetch,
): Promise<{base64: string; contentType: string} | null> => {
  const downloaded = await downloadRemoteImage(url, fetchFn);
  if (!downloaded) {
    return null;
  }
  return {
    base64: downloaded.buffer.toString('base64'),
    contentType: downloaded.contentType,
  };
};
