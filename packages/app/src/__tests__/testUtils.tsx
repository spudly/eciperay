import type {ParamListBase, RouteProp} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act} from '@testing-library/react-native';
import React from 'react';

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
