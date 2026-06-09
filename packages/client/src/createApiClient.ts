export type ApiClient = {
  fetch: <T>(path: string, options?: RequestInit) => Promise<T>;
};

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
      try {
        const body = await response.text();
        const json = JSON.parse(body) as {error?: string};
        if (json.error) {
          message = json.error;
        }
      } catch {
        // keep default message when the body is not JSON
      }
      throw new Error(message);
    }
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    return response.json() as Promise<T>;
  };
  return {fetch: fetchApi};
};
