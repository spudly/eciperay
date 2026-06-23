import {
  AUTH_DEEP_LINK_REDIRECT_URL,
  AUTH_DEEP_LINK_SCHEME,
  isAuthDeepLinkUrl,
} from './authDeepLink';

describe('authDeepLink', () => {
  test('uses the dev scheme while __DEV__ is true', () => {
    expect(AUTH_DEEP_LINK_SCHEME).toBe('com.eciperay.dev');
    expect(AUTH_DEEP_LINK_REDIRECT_URL).toBe(
      'com.eciperay.dev://auth/callback',
    );
    expect(isAuthDeepLinkUrl('com.eciperay.dev://auth/callback?code=abc')).toBe(
      true,
    );
    expect(isAuthDeepLinkUrl('com.eciperay://auth/callback?code=abc')).toBe(
      false,
    );
  });

  test('uses the production scheme when __DEV__ is false', () => {
    const previousDev = (globalThis as {__DEV__?: boolean}).__DEV__;
    (globalThis as {__DEV__?: boolean}).__DEV__ = false;

    jest.isolateModules(() => {
      const productionAuthDeepLink =
        require('./authDeepLink') as typeof import('./authDeepLink');

      expect(productionAuthDeepLink.AUTH_DEEP_LINK_SCHEME).toBe('com.eciperay');
      expect(productionAuthDeepLink.AUTH_DEEP_LINK_REDIRECT_URL).toBe(
        'com.eciperay://auth/callback',
      );
      expect(
        productionAuthDeepLink.isAuthDeepLinkUrl(
          'com.eciperay://auth/callback?code=abc',
        ),
      ).toBe(true);
      expect(
        productionAuthDeepLink.isAuthDeepLinkUrl(
          'com.eciperay.dev://auth/callback?code=abc',
        ),
      ).toBe(false);
    });

    (globalThis as {__DEV__?: boolean}).__DEV__ = previousDev;
  });
});
