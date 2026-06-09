import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act} from '@testing-library/react-native';
import React from 'react';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
      mutations: {retry: false},
    },
  });

export const renderWithProviders = (
  ui: React.ReactElement,
  client = makeQueryClient(),
) => <QueryClientProvider client={client}>{ui}</QueryClientProvider>;

export const settleAsyncUpdates = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
