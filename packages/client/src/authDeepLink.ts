import type {Session, SupabaseClient} from '@supabase/supabase-js';

export const AUTH_DEEP_LINK_SCHEME = 'com.eciperay';
export const AUTH_DEEP_LINK_HOST = 'auth';
export const AUTH_DEEP_LINK_CALLBACK_PATH = 'callback';
export const AUTH_DEEP_LINK_REDIRECT_URL = `${AUTH_DEEP_LINK_SCHEME}://${AUTH_DEEP_LINK_HOST}/${AUTH_DEEP_LINK_CALLBACK_PATH}`;

export const isAuthDeepLinkUrl = (url: string): boolean =>
  url.startsWith(`${AUTH_DEEP_LINK_SCHEME}://`);

export const parseAuthDeepLinkParams = (url: string): URLSearchParams => {
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    return new URLSearchParams(url.slice(hashIndex + 1));
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    return new URLSearchParams(url.slice(queryIndex + 1));
  }

  return new URLSearchParams();
};

export type AuthDeepLinkSessionResult = {session: Session | null};

export const createSessionFromAuthDeepLink = async (
  supabase: SupabaseClient,
  url: string,
): Promise<AuthDeepLinkSessionResult> => {
  const params = parseAuthDeepLinkParams(url);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (code) {
    const {data, error} = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return {session: data.session};
  }

  if (accessToken && refreshToken) {
    const {data, error} = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return {session: data.session};
  }

  return {session: null};
};
