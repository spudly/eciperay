import {supabase} from './supabase';
import {API_BASE_URL} from './env';

const getAuthToken = async (): Promise<string | null> => {
  const {data} = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

const buildHeaders = (token: string | null): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? {Authorization: `Bearer ${token}`} : {}),
});

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${path}`);
  }
  return response.json() as Promise<T>;
};
