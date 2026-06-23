import './global.css';

import {
  AnalyticsErrorBoundaryProvider,
  AnalyticsProvider,
  AuthProvider,
  identifyAnalyticsUser,
} from '@eciperay/client';
import type {Session} from '@supabase/supabase-js';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

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

const App = () => (
  <GestureHandlerRootView className="flex-1 font-sans">
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AnalyticsProvider analytics={analytics}>
          <AuthProvider
            supabase={supabase}
            onAuthenticated={onAuthenticated}
            onSignedOut={onSignedOut}
          >
            <AnalyticsErrorBoundaryProvider>
              <RootNavigator />
            </AnalyticsErrorBoundaryProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

export default App;
