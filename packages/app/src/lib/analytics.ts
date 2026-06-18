import {createAppAnalytics, appAnalyticsPlatform} from './createAppAnalytics';
import {POSTHOG_HOST, POSTHOG_KEY} from './env';

export {createAppAnalytics, appAnalyticsPlatform} from './createAppAnalytics';

export const analytics = createAppAnalytics(
  POSTHOG_KEY,
  POSTHOG_HOST,
  appAnalyticsPlatform,
);
