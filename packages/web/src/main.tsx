import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
  FeedbackPreferenceProvider,
} from '@eciperay/client';
import {eciperayTamaguiConfig} from '@spudly/ui';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {TamaguiProvider} from 'tamagui';

import {onAuthenticated, onSignedOut} from './lib/authSessionLifecycle.js';
import {analytics} from './lib/analytics.js';
import {router} from './routes/router.js';
import {supabase} from './lib/supabase.js';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, retry: 1}},
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <TamaguiProvider
        config={eciperayTamaguiConfig}
        defaultTheme="light"
      >
        <QueryClientProvider client={queryClient}>
          <AnalyticsProvider analytics={analytics}>
            <AuthProvider
              supabase={supabase}
              onAuthenticated={onAuthenticated}
              onSignedOut={onSignedOut}
            >
              <AnalyticsErrorBoundaryProvider>
                <FeedbackPreferenceProvider>
                  <RouterProvider router={router} />
                </FeedbackPreferenceProvider>
              </AnalyticsErrorBoundaryProvider>
            </AuthProvider>
          </AnalyticsProvider>
        </QueryClientProvider>
      </TamaguiProvider>
    </StrictMode>,
  );
}
