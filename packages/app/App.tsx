import './global.css';

import {AuthProvider} from '@recipoo/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

import {api} from './src/lib/api';
import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const syncAuthenticatedUser = async () => {
  await api.auth.syncUser();
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider
      supabase={supabase}
      onAuthenticated={syncAuthenticatedUser}
    >
      <RootNavigator />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
