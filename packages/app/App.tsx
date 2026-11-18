import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
} from '@eciperay/client';
import {I18nProvider} from '@lingui/react';
import {VoiceProvider} from '@spudly/ui';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import type {ViewStyle} from 'react-native';
import {getLocales} from 'react-native-localize';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TamaguiProvider} from 'tamagui';

import {AppFeedbackPreferenceProvider} from './src/context/AppFeedbackPreferenceProvider';
import {createI18n} from './src/i18n/i18n';
import {resolveLocale} from './src/i18n/locale';
import {eciperayVoice} from './src/i18n/voice';
import {analytics} from './src/lib/analytics';
import {onAuthenticated, onSignedOut} from './src/lib/authSessionLifecycle';
import {appTamaguiConfig} from './src/lib/tamaguiConfig';
import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const i18n = createI18n(
  resolveLocale(
    null,
    getLocales().map(locale => locale.languageTag),
  ),
);

const queryClient = new QueryClient();

const rootViewStyle: ViewStyle = {flex: 1};

const App = () => (
  <I18nProvider i18n={i18n}>
    <VoiceProvider voice={eciperayVoice}>
      <TamaguiProvider
        config={appTamaguiConfig}
        defaultTheme="light"
      >
        <GestureHandlerRootView style={rootViewStyle}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <AnalyticsProvider analytics={analytics}>
                <AppFeedbackPreferenceProvider>
                  <AuthProvider
                    supabase={supabase}
                    onAuthenticated={onAuthenticated}
                    onSignedOut={onSignedOut}
                  >
                    <AnalyticsErrorBoundaryProvider>
                      <RootNavigator />
                    </AnalyticsErrorBoundaryProvider>
                  </AuthProvider>
                </AppFeedbackPreferenceProvider>
              </AnalyticsProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </TamaguiProvider>
    </VoiceProvider>
  </I18nProvider>
);

export default App;
