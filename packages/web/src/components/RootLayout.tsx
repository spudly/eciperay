import {Outlet} from 'react-router-dom';

import {AnalyticsConsentBanner} from './AnalyticsConsentBanner.js';
import {MobileAppInstallBanner} from './MobileAppInstallBanner.js';

export const RootLayout = () => (
  <>
    <MobileAppInstallBanner />
    <Outlet />
    <AnalyticsConsentBanner />
  </>
);
