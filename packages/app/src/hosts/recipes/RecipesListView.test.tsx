import {tokens} from '@spudly/ui';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import type {RecipeDetail} from '@eciperay/types';
import React from 'react';
import {Linking} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {
  DISCOVER_ERROR_MESSAGE,
  RECIPE_STATUS_FILTER_ALL,
  WEB_APP_BASE_URL,
  demoRecipeListFilters,
  queryKeys,
  type RecipeStatusFilterValue,
} from '@eciperay/client';

import {
  makeCookLog,
  makePublicRecipeDiscoveryItem,
  makeRecipeDetail,
} from '../../__tests__/fixtures/recipe';
import {makeQueryClient, renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';
import {recipeHref} from '../../lib/deepLinks';

import {InlineCookLogForm, RecipesListView} from './RecipesListView';

jest.mock('../../lib/api');

const mockCreateCookLog = api.cookLogs.create as jest.Mock;

/**
 * Regression test for #162 (Android 1.25.0: this screen rendered one giant
 * empty box instead of the filter bar and recipe list).
 *
 * The on-device failure was a layout explosion in the design system's
 * SearchField (see spudly/design-system's glyph-line-height test): the filter
 * bar's first control stretched to the full screen height and the search input,
 * the select triggers, and every recipe card were absent from the device's view
 * hierarchy entirely. Jest renderers do not run Yoga layout, so this test
 * guards the render-tree half of the contract — every element the screen
 * promises must actually be present in the rendered host tree — while the
 * design-system source scan pins the style half.
 */
describe('RecipesListView element presence (#162)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };

  test('renders the search input, all three select triggers, and the first recipe card', async () => {
    const {findByText, getByLabelText, getByPlaceholderText, getByText} =
      await renderWithProviders(
        <RecipesListView
          {...controls}
          isLoading={false}
          recipes={[makeRecipeDetail({title: 'Pasta Night'})]}
          isFetchingNextPage={false}
          onLoadMore={jest.fn()}
        />,
      );

    // Search input.
    expect(getByPlaceholderText('Search recipes…')).toBeTruthy();
    // The #96 collapsed bar: at default values the selects live behind
    // the Filters chooser, so add each filter to render its select —
    // the presence contract below is unchanged.
    expect(getByText('Filters')).toBeTruthy();
    await fireEvent.press(getByText('Filters'));
    await fireEvent.press(getByLabelText('Add Status filter'));
    // The three select triggers: label + currently selected value.
    expect(await findByText('Status')).toBeTruthy();
    expect(await findByText('All statuses')).toBeTruthy();
    await fireEvent.press(getByText('Filters'));
    await fireEvent.press(getByLabelText('Add Sort filter'));
    expect(await findByText('Sort by')).toBeTruthy();
    expect(await findByText('Newest')).toBeTruthy();
    expect(await findByText('Order')).toBeTruthy();
    expect(await findByText('High to low')).toBeTruthy();
    // First recipe card: rows are links since @spudly/ui 1.15.0, so
    // the card is found by its accessible label (the recipe title).
    expect(getByLabelText('Pasta Night')).toBeTruthy();
  });
});

/**
 * Regression test for #188 (Android: the Recipes screen did not scroll — the
 * filter form filled the viewport and the recipe list was unreachable).
 *
 * The on-device failure was geometry, not rendering: the FlatList had no flex
 * bound inside the fixed `list` shell, so it sized to its full content height,
 * overflowed the viewport, and never scrolled; the pinned filter form above it
 * left only a sliver in any case. Jest renderers do not run Yoga layout, so
 * this test pins the rendered contract the fix relies on — the list's scroll
 * view is bounded (flex: 1) and the filters render inside it as its header,
 * travelling with the list — while the #183 Phase 2 emulator tests are the
 * on-device check. The list's scroll view is the RCTScrollView carrying the
 * list content padding (spacing 4 / 8).
 */
describe('RecipesListView list scrollability (#188)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };

  test('bounds the FlatList and renders the filters as its scrollable header', async () => {
    const {container} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[makeRecipeDetail({title: 'Pasta Night'})]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    const lists = container.queryAll(
      node =>
        node.type === 'RCTScrollView' &&
        node.props.contentContainerStyle?.paddingHorizontal ===
          tokens.spacing[4] &&
        node.props.contentContainerStyle?.paddingBottom === tokens.spacing[8],
    );
    expect(lists).toHaveLength(1);
    const list = lists[0];
    expect(list.props.style).toEqual(expect.objectContaining({flex: 1}));
    // The filter controls live inside this scroll view, so taps on them
    // must land while the keyboard is open rather than dismissing it.
    expect(list.props.keyboardShouldPersistTaps).toBe('handled');
    // The search input (filters header) and the first card both live
    // inside the list's own scroll view, so they scroll together.
    expect(
      list.queryAll(node => node.props.placeholder === 'Search recipes…'),
    ).toHaveLength(1);
    expect(
      list.queryAll(node => node.children.includes('Pasta Night')),
    ).not.toHaveLength(0);
  });

  test('keeps the filters mounted inside the list while loading', async () => {
    const {container, queryByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading
        recipes={[]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    // One list, still carrying the filters header — a tree swap on the
    // loading transition would unmount the focused search input
    // mid-typing (the screens' queries keep no previous data, so a
    // filter edit flips isLoading).
    const lists = container.queryAll(
      node =>
        node.type === 'RCTScrollView' &&
        node.props.contentContainerStyle?.paddingHorizontal ===
          tokens.spacing[4] &&
        node.props.contentContainerStyle?.paddingBottom === tokens.spacing[8],
    );
    expect(lists).toHaveLength(1);
    expect(
      lists[0].queryAll(node => node.props.placeholder === 'Search recipes…'),
    ).toHaveLength(1);
    // The loading state is not the empty state.
    expect(queryByText('No recipes found.')).toBeNull();
  });
});

/**
 * Cook-log composition (#49, stage 2): the DS page owns the row's log-cook
 * control and hides it for a row whose accessory renders content; the view
 * holds the open set and renders the app's form through the accessory slot.
 * These tests pin the behavior the per-card state used to give this screen — a
 * form expands under the tapped row, its row's control hides while it is open,
 * and forms open and close independently (several may be open at once).
 *
 * Row contract at @spudly/ui 1.8.0: there is no "Log cook" text button and no
 * Delete on list rows. A rated recipe's stars are the control (label "Log a
 * cook of {title}, rated {rating} out of 5 stars"); an unrated recipe gets a
 * single icon-only button (label "Log a cook of {title}"). The fixture recipes
 * are unrated unless a test says otherwise, so the labels below are the unrated
 * form.
 */
describe('RecipesListView cook-log accessory (#49 stage 2)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };
  const pasta = makeRecipeDetail({id: 'pasta-id', title: 'Pasta Night'});
  const salad = makeRecipeDetail({id: 'salad-id', title: 'Salad Days'});

  const renderView = () =>
    renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta, salad]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

  beforeEach(() => {
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('opens the form under the tapped row and hides only that row’s log-cook control', async () => {
    const {getAllByText, getByLabelText, queryByLabelText, queryByText} =
      await renderView();

    // No Delete and no "Log cook" text on list rows at 1.8.0; each
    // unrated row's only log-cook affordance is its icon-only button.
    expect(queryByText('Delete')).toBeNull();
    expect(queryByText('Log cook')).toBeNull();
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(getByLabelText('Log a cook of Salad Days')).toBeTruthy();
    expect(queryByText('How did it go?')).toBeNull();

    await fireEvent.press(getByLabelText('Log a cook of Pasta Night'));

    expect(getAllByText('How did it go?')).toHaveLength(1);
    // The open row's control is hidden; the other row keeps its own.
    expect(queryByLabelText('Log a cook of Pasta Night')).toBeNull();
    expect(getByLabelText('Log a cook of Salad Days')).toBeTruthy();
  });

  test('a rated recipe logs a cook through its stars, and its subtitle carries no rating text', async () => {
    const rated = makeRecipeDetail({
      id: 'rated-id',
      title: 'Rated Stew',
      communityRating: {average: 4.5, count: 3, hasStaleRatings: false},
      satietyScore: 60,
    });
    const {getByLabelText, getByText, queryByLabelText} =
      await renderWithProviders(
        <RecipesListView
          {...controls}
          isLoading={false}
          recipes={[rated]}
          isFetchingNextPage={false}
          onLoadMore={jest.fn()}
        />,
      );

    // The rating is passed as the item's `rating`, so the page renders
    // the stars from it and the subtitle keeps only the satiety
    // segment — the rating text must not appear a second time.
    expect(getByLabelText(/Satiety 60/)).toBeTruthy();
    expect(queryByLabelText(/4\.5★/)).toBeNull();
    expect(
      getByLabelText('Log a cook of Rated Stew, rated 4.5 out of 5 stars'),
    ).toBeTruthy();

    await fireEvent.press(
      getByLabelText('Log a cook of Rated Stew, rated 4.5 out of 5 stars'),
    );
    expect(getByText('How did it go?')).toBeTruthy();
  });

  test('forms open and close independently — a second form opens while the first stays open', async () => {
    const {getAllByText, getByLabelText, queryByLabelText, queryByText} =
      await renderView();

    await fireEvent.press(getByLabelText('Log a cook of Pasta Night'));
    await fireEvent.press(getByLabelText('Log a cook of Salad Days'));

    expect(getAllByText('How did it go?')).toHaveLength(2);
    expect(queryByLabelText('Log a cook of Pasta Night')).toBeNull();
    expect(queryByLabelText('Log a cook of Salad Days')).toBeNull();
    expect(queryByText('Log cook')).toBeNull();

    // Cancelling one form leaves the other open and restores only
    // the cancelled row's control.
    await fireEvent.press(getAllByText('Skip')[0]);

    expect(getAllByText('How did it go?')).toHaveLength(1);
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(queryByLabelText('Log a cook of Salad Days')).toBeNull();
  });

  test('saves the cook log through the slot form and closes it', async () => {
    const {getByLabelText, getByText, queryByText} = await renderView();

    await fireEvent.press(getByLabelText('Log a cook of Pasta Night'));
    await fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockCreateCookLog).toHaveBeenCalledWith(
        pasta.id,
        pasta.versionId,
        {authorStarRating: null, notes: null},
      );
    });
    await waitFor(() => {
      expect(queryByText('How did it go?')).toBeNull();
    });
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(getByLabelText('Log a cook of Salad Days')).toBeTruthy();
  });

  test('a pending save cannot be cancelled away — the form stays open until the save settles', async () => {
    let resolveCreate: (cookLog: ReturnType<typeof makeCookLog>) => void = () =>
      undefined;
    mockCreateCookLog.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreate = resolve;
        }),
    );
    const {getByLabelText, getByText, queryByText} = await renderView();

    await fireEvent.press(getByLabelText('Log a cook of Pasta Night'));
    await fireEvent.press(getByText('Save'));
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);

    // Cancel while the save is in flight must not unmount the form
    // and its mutation: the card kept the mutation mounted across a
    // cancel/reopen, so a pending save stayed unrepeatable. Here the
    // form simply stays open until the save settles.
    await fireEvent.press(getByText('Skip'));
    expect(queryByText('How did it go?')).toBeTruthy();
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);

    // When the save lands, the form closes as usual.
    await act(async () => {
      resolveCreate(makeCookLog());
    });
    await waitFor(() => {
      expect(queryByText('How did it go?')).toBeNull();
    });
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(getByLabelText('Log a cook of Salad Days')).toBeTruthy();
  });

  test('a recipe that leaves the list returns with its form closed', async () => {
    const view = (list: RecipeDetail[]) => (
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={list}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />
    );
    const {getByLabelText, queryByText, rerender} = await renderWithProviders(
      view([pasta, salad]),
    );

    await fireEvent.press(getByLabelText('Log a cook of Pasta Night'));
    expect(queryByText('How did it go?')).toBeTruthy();

    // Filter the recipe out, then bring it back. The card discarded
    // its open state when it unmounted, so the returning row is
    // closed — the lifted open set prunes ids whose rows are gone
    // instead of reopening a fresh empty form.
    await rerender(view([salad]));
    await rerender(view([pasta, salad]));

    expect(queryByText('How did it go?')).toBeNull();
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(getByLabelText('Log a cook of Salad Days')).toBeTruthy();
  });
});

/**
 * Unmount reconciliation (#49 stage 2): the DS page's FlatList is virtualized,
 * so a row scrolled far off screen unmounts — in jest that unmount cannot be
 * reproduced through the view (no layout runs), so these tests pin the form's
 * half of the contract directly: when the slot form unmounts, it removes its id
 * from the host's open set via onClose, and the row that later remounts renders
 * closed (the same end state the find-2 rerender test pins through the list).
 * The card got this for free — its open state died with the card.
 */
describe('InlineCookLogForm unmount reconciliation (#49 stage 2)', () => {
  const pasta = makeRecipeDetail({id: 'pasta-id', title: 'Pasta Night'});

  beforeEach(() => {
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('unmounting the form closes it in the host open set', async () => {
    const onClose = jest.fn();
    const {unmount} = await renderWithProviders(
      <InlineCookLogForm
        recipe={pasta}
        onClose={onClose}
      />,
    );

    await unmount();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('unmounting during a pending save still reconciles the open flag', async () => {
    mockCreateCookLog.mockImplementation(() => new Promise(() => undefined));
    const onClose = jest.fn();
    const {getByText, unmount} = await renderWithProviders(
      <InlineCookLogForm
        recipe={pasta}
        onClose={onClose}
      />,
    );

    await fireEvent.press(getByText('Save'));
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await unmount();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a save completing after this form was replaced does not close the replacement', async () => {
    const client = makeQueryClient();

    // A probe query on the recipe key whose refetch the test holds
    // open: the save's success handler awaits invalidateRecipeQueries,
    // which awaits that refetch — a controllable completion window.
    let releaseRefetch: () => void = () => undefined;
    let refetchArmed = false;
    const probeQueryFn = jest.fn(() => {
      if (!refetchArmed) {
        return Promise.resolve({id: pasta.id});
      }
      return new Promise<{id: string}>(resolve => {
        releaseRefetch = () => {
          resolve({id: pasta.id});
        };
      });
    });
    const Probe = () => {
      useQuery({queryKey: queryKeys.recipe(pasta.id), queryFn: probeQueryFn});
      return null;
    };
    await renderWithProviders(<Probe />, client);
    await waitFor(() => {
      expect(client.getQueryState(queryKeys.recipe(pasta.id))?.status).toBe(
        'success',
      );
    });

    // The original form, with a save whose create call is held too.
    let releaseCreate: () => void = () => undefined;
    mockCreateCookLog.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseCreate = () => {
            resolve(makeCookLog());
          };
        }),
    );
    const onClose = jest.fn();
    const original = await renderWithProviders(
      <InlineCookLogForm
        recipe={pasta}
        onClose={onClose}
      />,
      client,
    );
    await fireEvent.press(original.getByText('Save'));
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);

    // The save succeeds; its completion parks in the invalidation,
    // waiting on the probe's held refetch.
    refetchArmed = true;
    await act(async () => {
      releaseCreate();
    });
    await waitFor(() => {
      expect(probeQueryFn).toHaveBeenCalledTimes(2);
    });

    // The row unmounts (filter/virtualization): the form reconciles
    // its open flag on the way out, and a replacement form opens for
    // the same recipe under the same host close callback.
    await original.unmount();
    expect(onClose).toHaveBeenCalledTimes(1);
    const replacement = await renderWithProviders(
      <InlineCookLogForm
        recipe={pasta}
        onClose={onClose}
      />,
      client,
    );
    expect(replacement.getByText('How did it go?')).toBeTruthy();

    // The original save's completion now lands. It must not fire
    // the shared close again: the flag came off exactly once (the
    // unmount), and the replacement form is still open.
    await act(async () => {
      releaseRefetch();
    });
    await waitFor(() => {
      expect(client.isMutating()).toBe(0);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(replacement.getByText('How did it go?')).toBeTruthy();
  });
});

/**
 * Load-more error row (@spudly/ui 6.x): the screen's latched next-page failure
 * crosses through the host's loadMoreErrorMessage / onLoadMoreRetry props and
 * renders as the page's own-section error row after the own rows — the surface
 * the DS Alert under the list provided until 6.x. The row and its retry press
 * are pinned here, with a short list, because at the screen level the row sits
 * beyond the virtualized list's rendered window in Jest.
 */
describe('RecipesListView load-more error row', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };

  test('renders the load-more error and fires the retry', async () => {
    const onLoadMoreRetry = jest.fn();
    const {getByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[makeRecipeDetail({title: 'Pasta Night'})]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
        loadMoreErrorMessage="Couldn't load more recipes."
        onLoadMoreRetry={onLoadMoreRetry}
      />,
    );

    expect(getByText("Couldn't load more recipes.")).toBeTruthy();
    await fireEvent.press(getByText('Try again'));
    expect(onLoadMoreRetry).toHaveBeenCalledTimes(1);
  });

  test('renders no error row without a load-more error', async () => {
    const {queryByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[makeRecipeDetail({title: 'Pasta Night'})]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    expect(queryByText("Couldn't load more recipes.")).toBeNull();
  });
});

/**
 * Unified browse sections (#412): the view appends the shared-with-me rows to
 * the own section after the created rows — "Shared" badge, public-permalink
 * destination, and no log-cook control (`canLogCook: false`, DS #543) — and
 * renders the discovery section from the public catalog items, with its own
 * first-page error state. This mapping moved here from the retired
 * SharedWithMeView.
 */
describe('RecipesListView unified sections (#412)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };
  const pasta = makeRecipeDetail({id: 'pasta-id', title: 'Pasta Night'});
  const sharedSoup = makeRecipeDetail({
    id: 'shared-1',
    slug: 'shared-soup',
    title: 'Shared Soup',
    userId: 'other-user',
  });

  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders shared rows after created rows with the Shared badge and no log-cook control', async () => {
    const {container, getByLabelText, queryByLabelText} =
      await renderWithProviders(
        <RecipesListView
          {...controls}
          isLoading={false}
          recipes={[pasta]}
          sharedRecipes={[sharedSoup]}
          isFetchingNextPage={false}
          onLoadMore={jest.fn()}
        />,
      );

    expect(getByLabelText('Pasta Night')).toBeTruthy();
    expect(getByLabelText('Shared Soup')).toBeTruthy();
    // On native the badge is display-only: it folds into the row's
    // composite accessible label ("title, subtitle, Shared") rather
    // than rendering as a findable text node.
    expect(getByLabelText(/, Shared$/)).toBeTruthy();
    // The created row keeps its log-cook control; the shared row
    // renders none at all.
    expect(getByLabelText('Log a cook of Pasta Night')).toBeTruthy();
    expect(queryByLabelText('Log a cook of Shared Soup')).toBeNull();
    // Order: created rows come before shared rows in the own section
    // — compare the rows' accessible labels in tree order.
    const labels = container
      .queryAll(node => typeof node.props?.accessibilityLabel === 'string')
      .map(node => node.props.accessibilityLabel as string);
    const pastaIndex = labels.findIndex(label =>
      label.startsWith('Pasta Night'),
    );
    const sharedIndex = labels.findIndex(label =>
      label.startsWith('Shared Soup'),
    );
    expect(pastaIndex).toBeGreaterThanOrEqual(0);
    expect(sharedIndex).toBeGreaterThan(pastaIndex);
  });

  // A created row's card is an href surface (#491): pressing it must
  // open the recipe's scheme deep link, which the navigation linking
  // config routes to RecipeDetail (see navigation/linking.test.ts).
  // Before #484's manifest + linking fix this press was swallowed on
  // Android and the tap did nothing.
  test('opens the recipe deep link when a created row is pressed', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('Pasta Night'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(recipeHref('pasta-id'));
    });
  });

  test('opens the public permalink when a shared row is pressed', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        sharedRecipes={[sharedSoup]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    await fireEvent.press(getByLabelText('Shared Soup'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `${WEB_APP_BASE_URL}/recipe/shared-1/shared-soup`,
      );
    });
  });

  test('renders discovery rows with author and discovery meta', async () => {
    const {getByLabelText, getByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        discoveryRecipes={[
          makePublicRecipeDiscoveryItem({
            id: 'public-1',
            slug: 'public-pie',
            title: 'Public Pie',
          }),
        ]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    expect(getByText('Discover')).toBeTruthy();
    // The discovery card's accessible name is its composite label
    // ("title, subtitle"), so the title and the author-bearing
    // subtitle are asserted through it.
    expect(getByLabelText(/^Public Pie/)).toBeTruthy();
    expect(getByLabelText(/By Pat Public/)).toBeTruthy();
    expect(getByText(/By Pat Public/)).toBeTruthy();
  });

  test('omits the byline on discovery rows whose author has no display name (#498)', async () => {
    const {getByLabelText, queryByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        discoveryRecipes={[
          makePublicRecipeDiscoveryItem({
            id: 'public-1',
            slug: 'public-pie',
            title: 'Public Pie',
            authorDisplayName: null,
          }),
        ]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    expect(getByLabelText(/^Public Pie/)).toBeTruthy();
    expect(queryByText(/Anonymous/)).toBeNull();
    expect(queryByText(/By /)).toBeNull();
  });

  test('renders the own-section loading row while fetching the next own page', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        isFetchingNextPage={false}
        isFetchingNextOwnPage
        onLoadMore={jest.fn()}
      />,
    );

    expect(getByLabelText('Loading')).toBeTruthy();
  });

  test('renders the discovery error state from the discovery error prop', async () => {
    const {getByLabelText, getByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[pasta]}
        discoveryRecipes={[]}
        discoveryErrorMessage={DISCOVER_ERROR_MESSAGE}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    expect(getByText(DISCOVER_ERROR_MESSAGE)).toBeTruthy();
    // The own section still renders its rows — a discovery failure
    // never hides it.
    expect(getByLabelText('Pasta Night')).toBeTruthy();
  });
});
