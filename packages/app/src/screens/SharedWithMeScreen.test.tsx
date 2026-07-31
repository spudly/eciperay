import React from 'react';
import {FlatList} from 'react-native';
import {act, waitFor} from '@testing-library/react-native';
import {
  RECIPE_LIST_PAGE_SIZE,
  SHARED_WITH_ME_EMPTY_MESSAGE,
} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  flushQueryClient,
  makeQueryClient,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {SharedWithMeScreen} from './SharedWithMeScreen';

jest.mock('../lib/api');

const mockListSharedWithMe = api.recipes.listSharedWithMe as jest.Mock;

const triggerEndReached = async (list: {
  props: {onEndReached?: () => void};
}) => {
  await act(async () => {
    list.props.onEndReached?.();
  });
};

describe('SharedWithMeScreen', () => {
  beforeEach(() => {
    mockListSharedWithMe.mockResolvedValue([]);
  });

  test('shows empty state', async () => {
    const {findByText} = renderWithProviders(<SharedWithMeScreen />);
    expect(await findByText(SHARED_WITH_ME_EMPTY_MESSAGE)).toBeTruthy();
  });

  test('lists shared recipes', async () => {
    mockListSharedWithMe.mockResolvedValue([
      makeRecipeDetail({
        id: 'shared-1',
        slug: 'shared-recipe',
        title: 'Shared Soup',
        userId: 'other-user',
      }),
    ]);
    const {findByText} = renderWithProviders(<SharedWithMeScreen />);
    expect(await findByText('Shared Soup')).toBeTruthy();
  });

  test('does not load more when there is no next page', async () => {
    mockListSharedWithMe.mockResolvedValue([
      makeRecipeDetail({title: 'Only Shared', userId: 'other-user'}),
    ]);
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByText('Only Shared');
    await triggerEndReached(UNSAFE_getByType(FlatList));
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledTimes(1);
    });
  });

  test('shows loading footer while fetching next page', async () => {
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({
        id: `shared-${index}`,
        title: `Shared ${index}`,
        userId: 'other-user',
      }),
    );
    let resolveSecondPage!: (
      value: ReturnType<typeof makeRecipeDetail>[],
    ) => void;
    const secondPagePromise = new Promise<
      ReturnType<typeof makeRecipeDetail>[]
    >(resolve => {
      resolveSecondPage = resolve;
    });
    mockListSharedWithMe.mockImplementation(
      async (params?: {offset?: number}) => {
        if (params?.offset === 0) {
          return firstPage;
        }
        return secondPagePromise;
      },
    );
    const client = makeQueryClient();
    const {findByText, getByLabelText, UNSAFE_getByType} = renderWithProviders(
      <SharedWithMeScreen />,
      client,
    );
    await findByText('Shared 0');
    const list = UNSAFE_getByType(FlatList);
    await act(async () => {
      list.props.onEndReached?.();
      await flushQueryClient(client);
    });
    await waitFor(() => {
      expect(getByLabelText('Loading')).toBeTruthy();
    });
    await act(async () => {
      resolveSecondPage([]);
      await flushQueryClient(client);
    });
  });

  test('loads more recipes when the list end is reached', async () => {
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({
        id: `shared-${index}`,
        title: `Shared ${index}`,
        userId: 'other-user',
      }),
    );
    mockListSharedWithMe.mockImplementation(
      async (params?: {offset?: number}) => {
        if (params?.offset === 0) {
          return firstPage;
        }
        return [
          makeRecipeDetail({
            id: 'shared-extra',
            title: 'Extra Shared',
            userId: 'other-user',
          }),
        ];
      },
    );
    const {findByText, UNSAFE_getByType} = renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByText('Shared 0');
    await triggerEndReached(UNSAFE_getByType(FlatList));
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledWith({
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: RECIPE_LIST_PAGE_SIZE,
      });
    });
  });
});
