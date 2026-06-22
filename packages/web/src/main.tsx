import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
  identifyAnalyticsUser,
  readAnalyticsConsent,
} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';

import {analytics} from './lib/analytics.js';
import {eciperay} from './lib/api.js';
import {router} from './routes/router.js';
import {supabase} from './lib/supabase.js';
import {AnalyticsConsentBanner} from './components/AnalyticsConsentBanner.js';
import {MobileAppInstallBanner} from './components/MobileAppInstallBanner.js';

import './index.css';

const onAuthenticated = async (session: Session) => {
  await eciperay.auth.syncUser();
  if (readAnalyticsConsent() === 'accepted') {
    identifyAnalyticsUser(analytics, session);
  }
};

const onSignedOut = () => {
  analytics.reset();
};

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, retry: 1}},
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider analytics={analytics}>
          <AuthProvider
            supabase={supabase}
            onAuthenticated={onAuthenticated}
            onSignedOut={onSignedOut}
          >
            <AnalyticsErrorBoundaryProvider>
              <MobileAppInstallBanner />
              <RouterProvider router={router} />
              <AnalyticsConsentBanner />
            </AnalyticsErrorBoundaryProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
