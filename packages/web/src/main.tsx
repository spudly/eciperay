import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
  FeedbackPreferenceProvider,
} from '@eciperay/client';
import {I18nProvider} from '@lingui/react';
import {VoiceProvider} from '@spudly/ui';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {TamaguiProvider} from 'tamagui';

import {createI18n} from './i18n/i18n.js';
import {eciperayVoice, resolveLocale} from '@eciperay/client';
import {onAuthenticated, onSignedOut} from './lib/authSessionLifecycle.js';
import {analytics} from './lib/analytics.js';
import {feedbackShortcutStorage} from './lib/feedbackShortcutStorage.js';
import {eciperayTamaguiConfig} from '@eciperay/client';
import {router} from './routes/router.js';
import {supabase} from './lib/supabase.js';

import './index.css';

const i18n = createI18n(resolveLocale(null, navigator.languages));

const queryClient = new QueryClient({
  defaultOptions: {queries: {staleTime: 30_000, retry: 1}},
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <VoiceProvider voice={eciperayVoice}>
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
                    <FeedbackPreferenceProvider storage={feedbackShortcutStorage}>
                      <RouterProvider router={router} />
                    </FeedbackPreferenceProvider>
                  </AnalyticsErrorBoundaryProvider>
                </AuthProvider>
              </AnalyticsProvider>
            </QueryClientProvider>
          </TamaguiProvider>
        </VoiceProvider>
      </I18nProvider>
    </StrictMode>,
  );
}
