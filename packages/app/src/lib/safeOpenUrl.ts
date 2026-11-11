import {Linking} from 'react-native';

/**
 * Opens a URL through Linking, swallowing a failed open (#484).
 *
 * A `Linking.openURL` against a URL no activity handles — an own-scheme deep
 * link Android cannot deliver, or a stale route from an older build — rejects,
 * and an uncaught rejection surfaces in error tracking as an unhandled
 * rejection even though nothing the user can act on went wrong. Routing opens
 * through this helper makes a failed open degrade silently instead. Use it for
 * every in-app open, own-scheme or external.
 */
export const safeOpenUrl = async (url: string): Promise<void> => {
  try {
    await Linking.openURL(url);
  } catch {
    // No handler for this URL: degrade silently (see above).
  }
};
