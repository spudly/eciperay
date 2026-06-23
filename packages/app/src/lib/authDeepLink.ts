import {
  AUTH_DEEP_LINK_CALLBACK_PATH,
  AUTH_DEEP_LINK_HOST,
} from '@eciperay/client';

const PRODUCTION_SCHEME = 'com.eciperay';
const DEVELOPMENT_SCHEME = 'com.eciperay.dev';

export const AUTH_DEEP_LINK_SCHEME = __DEV__
  ? DEVELOPMENT_SCHEME
  : PRODUCTION_SCHEME;

export const AUTH_DEEP_LINK_REDIRECT_URL = `${AUTH_DEEP_LINK_SCHEME}://${AUTH_DEEP_LINK_HOST}/${AUTH_DEEP_LINK_CALLBACK_PATH}`;

export const isAuthDeepLinkUrl = (url: string): boolean =>
  url.startsWith(`${AUTH_DEEP_LINK_SCHEME}://`);

export {createSessionFromAuthDeepLink} from '@eciperay/client';
