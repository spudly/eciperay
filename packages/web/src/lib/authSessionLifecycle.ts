import type {Session} from '@supabase/supabase-js';

import {analytics, identifyAnalyticsUserIfConsented} from './analytics.js';
import {eciperay} from './api.js';

export const onAuthenticated = async (session: Session) => {
  await eciperay.auth.syncUser();
  identifyAnalyticsUserIfConsented(session);
};

export const onSignedOut = () => {
  analytics.reset();
};
