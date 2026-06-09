import {AuthProvider} from '@recipoo/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, type RenderOptions} from '@testing-library/react';
import type {ReactElement, ReactNode} from 'react';
import {MemoryRouter, type MemoryRouterProps} from 'react-router-dom';

import {supabase} from '../lib/supabase.js';

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });

type WrapperOptions = {
  route?: string;
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
  withAuth?: boolean;
};

export const createWrapper = ({
  route = '/',
  routerProps,
  queryClient = makeQueryClient(),
  withAuth = true,
}: WrapperOptions = {}) => {
  const Wrapper = ({children}: {children: ReactNode}) => {
    const inner = withAuth ? (
      <AuthProvider supabase={supabase}>{children}</AuthProvider>
    ) : (
      children
    );
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[route]}
          {...routerProps}
        >
          {inner}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
  return {Wrapper, queryClient};
};

export const renderWithProviders = (
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
) => {
  const {route, routerProps, queryClient, withAuth, ...renderOptions} = options;
  const {Wrapper} = createWrapper({route, routerProps, queryClient, withAuth});
  return render(ui, {wrapper: Wrapper, ...renderOptions});
};
