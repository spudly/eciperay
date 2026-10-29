export type ApiClient = {
  fetch: <T>(path: string, options?: RequestInit) => Promise<T>;
};

/**
 * Error thrown for a non-OK API response. `code` carries the server's
 * machine-readable `error` code when it sent one (e.g. 'duplicate_recipe'),
 * so callers can branch on it instead of matching the human message.
 */
export type ApiError = Error & {code?: string};

type ApiClientOptions = {
  baseUrl: string;
  getToken: () => Promise<string | null>;
};

const buildHeaders = (token: string | null): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? {Authorization: `Bearer ${token}`} : {}),
});

const recordFromHeaders = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {};
  // eslint-disable-next-line unicorn/no-array-for-each -- Headers has no iterable entries in our TS lib
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
};

type FetchHeaders = Record<string, string> | [string, string][] | Headers;

const toHeaderRecord = (headers: FetchHeaders): Record<string, string> => {
  if (headers instanceof Headers) {
    return recordFromHeaders(headers);
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
};

const mergeHeaders = (
  token: string | null,
  headers?: FetchHeaders,
): Record<string, string> => ({
  ...buildHeaders(token),
  ...(headers ? toHeaderRecord(headers) : {}),
});

export const createApiClient = (opts: ApiClientOptions): ApiClient => {
  const fetchApi = async <T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> => {
    const token = await opts.getToken();
    const response = await fetch(`${opts.baseUrl}${path}`, {
      ...options,
      headers: mergeHeaders(token, options.headers),
    });
    if (!response.ok) {
      let message = `API error ${response.status}: ${path}`;
      let code: string | undefined;
      try {
        const body = await response.text();
        const json = JSON.parse(body) as {error?: string; message?: string};
        if (json.error) {
          code = json.error;
          // Prefer the human sentence when the server pairs one with the
          // code (e.g. plan_required carries a message) — `error` alone can
          // be a raw machine code, which is meaningless in UI. A body with
          // only `message` is not our error shape and keeps the generic
          // fallback below.
          message = json.message ? json.message : json.error;
        }
      } catch {
        // keep default message when the body is not JSON
      }
      const error: ApiError = new Error(message);
      error.code = code;
      throw error;
    }
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    return response.json() as Promise<T>;
  };
  return {fetch: fetchApi};
};
