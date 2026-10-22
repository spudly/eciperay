import {tokens} from '@spudly/ui';
import {act, fireEvent, waitFor} from '@testing-library/react-native';
import type {RecipeDetail} from '@eciperay/types';
import React from 'react';
import {
  RECIPE_STATUS_FILTER_ALL,
  demoRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';

import {makeCookLog, makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
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
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={[makeRecipeDetail({title: 'Pasta Night'})]}
        isFetchingNextPage={false}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

    // Search input.
    expect(getByPlaceholderText('Search recipes…')).toBeTruthy();
    // The three select triggers: label + currently selected value.
    expect(getByText('Status')).toBeTruthy();
    expect(getByText('All statuses')).toBeTruthy();
    expect(getByText('Sort by')).toBeTruthy();
    expect(getByText('Newest')).toBeTruthy();
    expect(getByText('Order')).toBeTruthy();
    expect(getByText('High to low')).toBeTruthy();
    // First recipe card.
    expect(getByText('Pasta Night')).toBeTruthy();
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
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
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
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
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
 * Cook-log composition (#49, stage 2): the DS page owns the "Log cook" button
 * and hides it for a row whose accessory renders content; the view holds the
 * open set and renders the app's form through the accessory slot. These tests
 * pin the behavior the per-card state used to give this screen — a form expands
 * under the tapped row, its row's button hides while it is open, and forms open
 * and close independently (several may be open at once).
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
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        onLoadMore={jest.fn()}
      />,
    );

  beforeEach(() => {
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('opens the form under the tapped row and hides only that row’s Log cook button', async () => {
    const {getAllByText, queryByText} = await renderView();

    expect(getAllByText('Log cook')).toHaveLength(2);
    expect(queryByText('How did it go?')).toBeNull();

    await fireEvent.press(getAllByText('Log cook')[0]);

    expect(getAllByText('How did it go?')).toHaveLength(1);
    // The open row's button is hidden; the other row keeps its own.
    expect(getAllByText('Log cook')).toHaveLength(1);
  });

  test('forms open and close independently — a second form opens while the first stays open', async () => {
    const {getAllByText, queryByText} = await renderView();

    await fireEvent.press(getAllByText('Log cook')[0]);
    await fireEvent.press(getAllByText('Log cook')[0]);

    expect(getAllByText('How did it go?')).toHaveLength(2);
    expect(queryByText('Log cook')).toBeNull();

    // Cancelling one form leaves the other open and restores only
    // the cancelled row's button.
    await fireEvent.press(getAllByText('Cancel')[0]);

    expect(getAllByText('How did it go?')).toHaveLength(1);
    expect(getAllByText('Log cook')).toHaveLength(1);
  });

  test('saves the cook log through the slot form and closes it', async () => {
    const {getAllByText, getByText, queryByText} = await renderView();

    await fireEvent.press(getAllByText('Log cook')[0]);
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
    expect(getAllByText('Log cook')).toHaveLength(2);
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
    const {getAllByText, getByText, queryByText} = await renderView();

    await fireEvent.press(getAllByText('Log cook')[0]);
    await fireEvent.press(getByText('Save'));
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);

    // Cancel while the save is in flight must not unmount the form
    // and its mutation: the card kept the mutation mounted across a
    // cancel/reopen, so a pending save stayed unrepeatable. Here the
    // form simply stays open until the save settles.
    await fireEvent.press(getByText('Cancel'));
    expect(queryByText('How did it go?')).toBeTruthy();
    expect(mockCreateCookLog).toHaveBeenCalledTimes(1);

    // When the save lands, the form closes as usual.
    await act(async () => {
      resolveCreate(makeCookLog());
    });
    await waitFor(() => {
      expect(queryByText('How did it go?')).toBeNull();
    });
    expect(getAllByText('Log cook')).toHaveLength(2);
  });

  test('a recipe that leaves the list returns with its form closed', async () => {
    const view = (list: RecipeDetail[]) => (
      <RecipesListView
        {...controls}
        isLoading={false}
        recipes={list}
        isFetchingNextPage={false}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
        onLoadMore={jest.fn()}
      />
    );
    const {getAllByText, queryByText, rerender} = await renderWithProviders(
      view([pasta, salad]),
    );

    await fireEvent.press(getAllByText('Log cook')[0]);
    expect(queryByText('How did it go?')).toBeTruthy();

    // Filter the recipe out, then bring it back. The card discarded
    // its open state when it unmounted, so the returning row is
    // closed — the lifted open set prunes ids whose rows are gone
    // instead of reopening a fresh empty form.
    await rerender(view([salad]));
    await rerender(view([pasta, salad]));

    expect(queryByText('How did it go?')).toBeNull();
    expect(getAllByText('Log cook')).toHaveLength(2);
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
});
