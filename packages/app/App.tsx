import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
  identifyAnalyticsUser,
} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {eciperayTamaguiConfig} from '@spudly/ui';
import React from 'react';
import type {ViewStyle} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TamaguiProvider} from 'tamagui';

import {AppFeedbackPreferenceProvider} from './src/context/AppFeedbackPreferenceProvider';
import {api} from './src/lib/api';
import {analytics} from './src/lib/analytics';
import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const onAuthenticated = async (session: Session) => {
  await api.auth.syncUser();
  identifyAnalyticsUser(analytics, session);
};

const onSignedOut = () => {
  analytics.reset();
};

const queryClient = new QueryClient();

const rootViewStyle: ViewStyle = {flex: 1};

const App = () => (
  <TamaguiProvider
    config={eciperayTamaguiConfig}
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
);

export default App;
