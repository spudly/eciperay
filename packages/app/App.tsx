import './global.css';

import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {AuthProvider} from './src/context/AuthContext';
import {RootNavigator} from './src/navigation/RootNavigator';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
