import './global.css';

import {AuthProvider} from '@recipoo/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

import {RootNavigator} from './src/navigation/RootNavigator';
import {supabase} from './src/lib/supabase';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider supabase={supabase}>
      <RootNavigator />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
