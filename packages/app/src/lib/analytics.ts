import {createAppAnalytics, appAnalyticsPlatform} from './createAppAnalytics';
import {POSTHOG_HOST, POSTHOG_KEY} from './env';

export const analytics = createAppAnalytics(
  POSTHOG_KEY,
  POSTHOG_HOST,
  appAnalyticsPlatform,
);
