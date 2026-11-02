import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
} from '@eciperay/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import type {ViewStyle} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TamaguiProvider} from 'tamagui';

import {AppFeedbackPreferenceProvider} from './src/context/AppFeedbackPreferenceProvider';
import {analytics} from './src/lib/analytics';
import {
  onAuthenticated,
  onSignedOut,
} from './src/lib/authSessionLifecycle';
import {appTamaguiConfig} from './src/lib/tamaguiConfig';
import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const queryClient = new QueryClient();

const rootViewStyle: ViewStyle = {flex: 1};

const App = () => (
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
);

export default App;
