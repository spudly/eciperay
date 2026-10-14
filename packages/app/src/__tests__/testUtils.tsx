import type {ParamListBase, RouteProp} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AnalyticsProvider,
  createAnalytics,
  createNoopAnalyticsAdapter,
} from '@eciperay/client';
import {eciperayTamaguiConfig} from '@spudly/ui';
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  act,
  cleanup,
  render,
  type RenderOptions,
} from '@testing-library/react-native';
import React from 'react';
import {TamaguiProvider} from 'tamagui';

const testAnalytics = createAnalytics(createNoopAnalyticsAdapter(), 'android');

let testQueryScheduler: (callback: () => void) => void = callback => {
  callback();
};

export const setTestQueryScheduler = (
  scheduler: (callback: () => void) => void,
) => {
  testQueryScheduler = scheduler;
};

export const getTestQueryScheduler = () => testQueryScheduler;

export const activeQueryClients = new Set<QueryClient>();

const delay = (schedule: (callback: () => void) => void) =>
  new Promise<void>(resolve => {
    schedule(resolve);
  });

export const makeRoute = <
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList & string,
>(
  name: RouteName,
  params: ParamList[RouteName],
): RouteProp<ParamList, RouteName> =>
  ({key: `${name}-test`, name, params}) as unknown as RouteProp<
    ParamList,
    RouteName
  >;

export const makeStackProps = <
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList & string,
>(
  name: RouteName,
  params: ParamList[RouteName],
  navigation: Record<string, unknown>,
): NativeStackScreenProps<ParamList, RouteName> => ({
  navigation: navigation as unknown as NativeStackScreenProps<
    ParamList,
    RouteName
  >['navigation'],
  route: makeRoute(name, params),
});

export const makeTabProps = <
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList & string,
>(
  name: RouteName,
  params: ParamList[RouteName],
  navigation: Record<string, unknown>,
): BottomTabScreenProps<ParamList, RouteName> => ({
  navigation: navigation as unknown as BottomTabScreenProps<
    ParamList,
    RouteName
  >['navigation'],
  route: makeRoute(name, params),
});

export const makeQueryClient = () => {
  const client = new QueryClient({
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
  activeQueryClients.add(client);
  return client;
};

type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  client?: QueryClient;
};

export const renderWithProviders = (
  ui: React.ReactElement,
  clientOrOptions: QueryClient | RenderWithProvidersOptions = makeQueryClient(),
  maybeOptions?: RenderWithProvidersOptions,
) => {
  const client =
    clientOrOptions instanceof QueryClient
      ? clientOrOptions
      : (clientOrOptions.client ?? makeQueryClient());
  const options =
    clientOrOptions instanceof QueryClient ? maybeOptions : clientOrOptions;

  if (!activeQueryClients.has(client)) {
    activeQueryClients.add(client);
  }

  return render(ui, {
    ...options,
    wrapper: ({children}) => (
      <TamaguiProvider config={eciperayTamaguiConfig} defaultTheme="light">
        <QueryClientProvider client={client}>
          <AnalyticsProvider analytics={testAnalytics}>
            {children}
          </AnalyticsProvider>
        </QueryClientProvider>
      </TamaguiProvider>
    ),
  });
};

const waitForQueryClientIdle = async (client: QueryClient) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (client.isMutating() === 0 && client.isFetching() === 0) {
      await act(async () => {
        await delay(callback => {
          setTimeout(callback, 0);
        });
        await delay(callback => {
          setTimeout(callback, 0);
        });
      });
      if (client.isMutating() === 0 && client.isFetching() === 0) {
        return;
      }
    }
    await act(async () => {
      await delay(callback => {
        setTimeout(callback, 0);
      });
    });
  }
};

export const flushQueryClient = async (client: QueryClient) => {
  await waitForQueryClientIdle(client);
};

export const cleanupTestProviders = async () => {
  const scheduler = getTestQueryScheduler();
  notifyManager.setScheduler(callback => {
    callback();
  });
  cleanup();
  await act(async () => {
    await Promise.all(
      [...activeQueryClients].map(async client => {
        await waitForQueryClientIdle(client);
        client.getMutationCache().clear();
        client.clear();
        await client.cancelQueries();
      }),
    );
    activeQueryClients.clear();
  });
  notifyManager.setScheduler(scheduler);
};

export const settleAsyncUpdates = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
