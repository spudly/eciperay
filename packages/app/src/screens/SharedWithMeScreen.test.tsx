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

// The props the screen most recently passed its view, captured by the
// wrapper mock below. Since @spudly/ui 6.x the load-more error row
// sits after a full page of own rows, beyond the virtualized list's
// rendered window in Jest, so the screen-level retry contract is
// exercised by invoking the view's onLoadMoreRetry prop and reading
// its loadMoreErrorMessage prop — the row's own rendering and press
// are pinned in SharedWithMeView's tests, where the row is in window.
type CapturedSharedViewProps = {
  loadMoreErrorMessage?: string | null;
  ownErrorMessage?: string | null;
  onLoadMoreRetry?: () => void;
};

let mockSharedViewProps: CapturedSharedViewProps | null = null;

jest.mock('../hosts/shared/SharedWithMeView', () => {
  const actual = jest.requireActual<
    typeof import('../hosts/shared/SharedWithMeView')
  >('../hosts/shared/SharedWithMeView');
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    SharedWithMeView: (
      props: Parameters<typeof actual.SharedWithMeView>[0],
    ) => {
      mockSharedViewProps = props;
      return React.createElement(actual.SharedWithMeView, props);
    },
  };
});

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
    mockSharedViewProps = null;
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
    mockListSharedWithMe.mockImplementation(
      async (params?: {offset?: number}) => {
        if (params?.offset === 0) {
          return firstPage;
        }
        throw new Error('Next page failed');
      },
    );
    const client = makeQueryClient();
    const {findByLabelText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
      client,
    );
    await findByLabelText('Shared 0');
    const list = findList(container);

    // The first end-reached signal fetches the next page, which
    // fails and latches the fetch-next-page error. Since
    // @spudly/ui 6.x the failure surfaces as the page's own-section
    // load-more error row (the screen passes it through the host's
    // loadMoreErrorMessage / onLoadMoreRetry props); the row sits
    // after the page of own rows, beyond the virtualized list's
    // rendered window in Jest, so its rendering and its "Try
    // again" press are pinned in SharedWithMeView's tests, where
    // the row is in the window. The screen-level half of the
    // contract is the latch below.
    await triggerEndReached(list);
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
  });

  test('a manual retry fetches the failed page once, dedupes while in flight, and clears the error on recovery', async () => {
    // The retry half of the #371 contract, restored at screen level:
    // the latch test above stops at the latched error because the
    // page's error row is beyond the virtualized list's rendered
    // window in Jest — so this test drives the retry through the
    // props the screen passes its view (captured by the wrapper mock
    // at the top of this file), which is exactly what the row's
    // "Try again" press invokes in the view's own tests.
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
    const {findByLabelText, container} = await renderWithProviders(
      <SharedWithMeScreen />,
      client,
    );
    await findByLabelText('Shared 0');
    const list = findList(container);

    // The next page fails and the error latches onto the view's props.
    await triggerEndReached(list);
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(mockSharedViewProps?.loadMoreErrorMessage).toBe(
        "Couldn't load more recipes.",
      );
    });

    // The manual retry fetches the failed page again (2 → 3 calls).
    // The retry is held in flight: the error stays latched while it
    // runs (so the row and its action stay up), exactly as the
    // pre-6.x alert did.
    failNextPage = false;
    let resolveHeldRetry!: (
      value: ReturnType<typeof makeRecipeDetail>[],
    ) => void;
    heldRetry = new Promise<ReturnType<typeof makeRecipeDetail>[]>(resolve => {
      resolveHeldRetry = resolve;
    });
    await act(async () => {
      mockSharedViewProps?.onLoadMoreRetry?.();
    });
    await waitFor(() => {
      expect(mockListSharedWithMe).toHaveBeenCalledTimes(3);
    });
    expect(mockSharedViewProps?.loadMoreErrorMessage).toBe(
      "Couldn't load more recipes.",
    );

    // A retry invoked while a retry is already in flight issues no
    // duplicate request: the screen retries with
    // fetchNextPage({cancelRefetch: false}), which reuses the
    // in-flight fetch instead of cancelling and restarting it.
    await act(async () => {
      mockSharedViewProps?.onLoadMoreRetry?.();
      await flushQueryClient(client);
    });
    expect(mockListSharedWithMe).toHaveBeenCalledTimes(3);

    // Once the held retry resolves, the page is loaded and the
    // load-more error clears from the view's props.
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
      expect(mockSharedViewProps?.loadMoreErrorMessage).toBeNull();
    });
  });
});
