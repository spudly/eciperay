import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
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
    const {findByLabelText} = await renderWithProviders(<SharedWithMeScreen />);
    expect(await findByLabelText('Shared Soup')).toBeTruthy();
  });

  test('does not load more when there is no next page', async () => {
    mockListSharedWithMe.mockResolvedValue([
      makeRecipeDetail({title: 'Only Shared', userId: 'other-user'}),
    ]);
    const {findByLabelText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByLabelText('Only Shared');
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
    const {findByLabelText, getByLabelText, container} =
      await renderWithProviders(<SharedWithMeScreen />, client);
    await findByLabelText('Shared 0');
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
    const {findByLabelText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
    );
    await findByLabelText('Shared 0');
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

  test('a failed next page stops automatic retries and offers a manual retry', async () => {
    // Regression (#371): same gate as the Recipes screen — a failed
    // next page latches the fetch-next-page error, end-reached signals
    // stop fetching, and the alert under the list offers the retry.
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({
        id: `shared-${index}`,
        title: `Shared ${index}`,
        userId: 'other-user',
      }),
    );
    let failNextPage = true;
    let heldRetry: Promise<ReturnType<typeof makeRecipeDetail>[]> | null = null;
    mockListSharedWithMe.mockImplementation(
      async (params?: {offset?: number}) => {
        if (params?.offset === 0) {
          return firstPage;
        }
        if (failNextPage) {
          throw new Error('Next page failed');
        }
        if (heldRetry) {
          return heldRetry;
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
    const client = makeQueryClient();
    const {findByLabelText, findByText, getByText, queryByText, container} =
      await renderWithProviders(<SharedWithMeScreen />, client);
    await findByLabelText('Shared 0');
    const list = findList(container);

    // The first end-reached signal fetches the next page, which fails,
    // and the retry alert appears under the list.
    await triggerEndReached(list);
    expect(await findByText("Couldn't load more recipes.")).toBeTruthy();
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledTimes(2);
    });

    // Further end-reached signals must not cycle automatic retries
    // while the failed page is latched.
    await triggerEndReached(list);
    await triggerEndReached(list);
    await act(async () => {
      await flushQueryClient(client);
    });
    expect(mockListSharedWithMe).toHaveBeenCalledTimes(2);

    // Layout reservation: same structure as the Recipes screen —
    // the screen root is a flex: 1 column whose first child is the
    // flex: 1 list container and whose second child is the alert
    // container, so the alert sits inside the viewport instead of
    // below the full-height list shell.
    const root = container.children[0] as TestInstance;
    expect(root.props.style).toEqual(expect.objectContaining({flex: 1}));
    expect(root.children).toHaveLength(2);
    const [listContainer, alertContainer] = root.children as TestInstance[];
    expect(listContainer?.props.style).toEqual(
      expect.objectContaining({flex: 1}),
    );
    expect(alertContainer?.props.style).toEqual(
      expect.objectContaining({paddingVertical: 12}),
    );

    // Repeated retry taps while a retry is in flight must not
    // restart it (cancelRefetch: false reuses the in-flight fetch;
    // the alert stays up while it runs because the error is still
    // latched).
    failNextPage = false;
    let resolveHeldRetry!: (
      value: ReturnType<typeof makeRecipeDetail>[],
    ) => void;
    heldRetry = new Promise<ReturnType<typeof makeRecipeDetail>[]>(resolve => {
      resolveHeldRetry = resolve;
    });
    await fireEvent.press(getByText('Try again'));
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledTimes(3);
    });
    expect(queryByText("Couldn't load more recipes.")).toBeTruthy();
    await fireEvent.press(getByText('Try again'));
    await act(async () => {
      await flushQueryClient(client);
    });
    expect(mockListSharedWithMe).toHaveBeenCalledTimes(3);

    // The manual retry loads the page once the endpoint recovers:
    // the next page is fetched and the alert clears. (The new row
    // itself sits beyond the virtualized list's rendered window in
    // Jest, so the fetch and the cleared alert are the observable
    // half of the contract here.)
    await act(async () => {
      resolveHeldRetry([
        makeRecipeDetail({
          id: 'shared-extra',
          title: 'Extra Shared',
          userId: 'other-user',
        }),
      ]);
      await flushQueryClient(client);
    });
    await waitFor(() => {
      expect(queryByText("Couldn't load more recipes.")).toBeNull();
    });
  });
});
