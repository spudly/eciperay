import {createWebAnalytics} from './createWebAnalytics.js';
import {POSTHOG_HOST, POSTHOG_KEY} from './env.js';

export {createWebAnalytics} from './createWebAnalytics.js';

export const analytics = createWebAnalytics(POSTHOG_KEY, POSTHOG_HOST);
