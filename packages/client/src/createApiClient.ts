export type ApiClient = {
  fetch: <T>(path: string, options?: RequestInit) => Promise<T>;
};

/**
 * Error thrown for a non-OK API response. `code` carries the server's
 * machine-readable `error` code when it sent one (e.g. 'duplicate_recipe'), so
 * callers can branch on it instead of matching the human message. `status`
 * carries the HTTP status (e.g. 401 for an invalid/expired token), so callers
 * can branch on it even when the server's `error` value is a human sentence
 * rather than a machine code.
 */
export type ApiError = Error & {code?: string; status?: number};

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
    let response: Response;
    try {
      response = await fetch(`${opts.baseUrl}${path}`, {
        ...options,
        headers: mergeHeaders(token, options.headers),
      });
    } catch (cause) {
      // A rejected fetch() is a network-level failure (offline, DNS, API
      // unreachable): there is no response and no status. Surface it as a
      // typed ApiError instead of the raw TypeError so callers can treat it
      // as the transient failure it is (status 0 / code 'network_error')
      // rather than an unhandled exception (#378). A caller-initiated abort
      // is not a network failure: rethrow the original abort reason
      // unchanged so cancellation detection keeps working.
      if (options.signal?.aborted) {
        throw cause;
      }
      const error: ApiError = new Error(`Network error: ${path}`, {cause});
      error.code = 'network_error';
      error.status = 0;
      throw error;
    }
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
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    try {
      return (await response.json()) as T;
    } catch (cause) {
      // fetch() resolves when the headers arrive; a connection that drops
      // while the body is read makes json() reject with a TypeError. That
      // is the same network-level failure as a rejected fetch() (#378) —
      // convert it the same way. Anything else (a SyntaxError from a
      // malformed body, or the caller's own abort reason) is rethrown
      // unchanged.
      if (!(cause instanceof TypeError) || options.signal?.aborted) {
        throw cause;
      }
      const error: ApiError = new Error(`Network error: ${path}`, {cause});
      error.code = 'network_error';
      error.status = 0;
      throw error;
    }
  };
  return {fetch: fetchApi};
};
