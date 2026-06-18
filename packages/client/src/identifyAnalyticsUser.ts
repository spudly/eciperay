import type {Session} from '@supabase/supabase-js';

import type {AnalyticsClient} from './createAnalytics.js';

export const identifyAnalyticsUser = (
  analytics: AnalyticsClient,
  session: Session,
) => {
  analytics.identifyUser(session.user.id, {email: session.user.email});
};
