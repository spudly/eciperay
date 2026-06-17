import './global.css';

import {AuthProvider} from '@eciperay/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {api} from './src/lib/api';
import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const syncAuthenticatedUser = async () => {
  await api.auth.syncUser();
};

const queryClient = new QueryClient();

const App = () => (
  <GestureHandlerRootView className="flex-1">
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          supabase={supabase}
          onAuthenticated={syncAuthenticatedUser}
        >
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

export default App;
