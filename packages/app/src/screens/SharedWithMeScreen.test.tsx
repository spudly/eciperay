import React from 'react';
import {act, waitFor} from '@testing-library/react-native';
import {RECIPE_LIST_PAGE_SIZE} from '@eciperay/client';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {
  flushQueryClient,
  makeQueryClient,
  renderWithProviders,
} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {SharedWithMeScreen} from './SharedWithMeScreen';

import type {TestInstance} from 'test-renderer';

jest.mock('../lib/api');

const mockListSharedWithMe = api.recipes.listSharedWithMe as jest.Mock;

// RNTL v14 renders host elements only: the list is the host scroll view
// that receives the FlatList onEndReached prop.
const findList = (container: TestInstance) =>
  container.queryAll(node => typeof node.props?.onEndReached === 'function')[0];

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
    const {findByText} = await renderWithProviders(<SharedWithMeScreen />);
    // The DS page's EmptyState carries SHARED_WITH_ME_EMPTY_MESSAGE as
    // its title/body split — the constant's two sentences, one each.
    expect(
      await findByText('Recipes others share with you will appear here.'),
    ).toBeTruthy();
    expect(
      await findByText(
        'Open a share link while signed in to save recipes to this list.',
      ),
    ).toBeTruthy();
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
    const {findByText} = await renderWithProviders(<SharedWithMeScreen />);
    expect(await findByText('Shared Soup')).toBeTruthy();
  });

  test('does not load more when there is no next page', async () => {
    mockListSharedWithMe.mockResolvedValue([
      makeRecipeDetail({title: 'Only Shared', userId: 'other-user'}),
    ]);
    const {findByText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByText('Only Shared');
    await triggerEndReached(findList(container));
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
    const {findByText, getByLabelText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
      client,
    );
    await findByText('Shared 0');
    const list = findList(container);
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
    const {findByText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByText('Shared 0');
    await triggerEndReached(findList(container));
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledWith({
        limit: RECIPE_LIST_PAGE_SIZE,
        offset: RECIPE_LIST_PAGE_SIZE,
        sort: 'newest',
        sortDir: 'desc',
      });
    });
  });
});
