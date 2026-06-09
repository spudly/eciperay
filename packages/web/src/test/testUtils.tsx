import {AuthProvider} from '@recipoo/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  act,
  render,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
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

export const renderWithProviders = async (
  ui: ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {},
): Promise<RenderResult> => {
  const {route, routerProps, queryClient, withAuth, ...renderOptions} = options;
  const {Wrapper} = createWrapper({route, routerProps, queryClient, withAuth});
  let view!: RenderResult;
  await act(async () => {
    view = render(ui, {wrapper: Wrapper, ...renderOptions});
    await Promise.resolve();
  });
  return view;
};

export const settleAsyncUpdates = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
