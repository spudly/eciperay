import {tokens} from '@spudly/ui';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import type {RecipeDetail} from '@eciperay/types';
import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  RECIPE_STATUS_FILTER_ALL,
  demoRecipeListFilters,
  queryKeys,
  type RecipeStatusFilterValue,
} from '@eciperay/client';

import {makeCookLog, makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {makeQueryClient, renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

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
