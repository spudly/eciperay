import {Outlet} from 'react-router-dom';

import {AnalyticsConsentBanner} from './AnalyticsConsentBanner.js';
import {FeedbackBubble} from './FeedbackBubble.js';
import {MobileAppInstallBanner} from './MobileAppInstallBanner.js';

export const RootLayout = () => (
  <>
    <MobileAppInstallBanner />
    <Outlet />
    <AnalyticsConsentBanner />
    <FeedbackBubble />
  </>
);
