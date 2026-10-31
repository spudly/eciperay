import {tokens} from '@spudly/ui';
import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Linking} from 'react-native';
import {
  RECIPE_STATUS_FILTER_ALL,
  WEB_APP_BASE_URL,
  demoRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {SharedWithMeView} from './SharedWithMeView';

/**
 * Regression test for #162 (Android 1.25.0: this screen rendered one giant
 * empty box instead of the filter bar and recipe list — the on-device hierarchy
 * dump that identified the root cause was captured on this screen).
 *
 * The failure was a layout explosion in the design system's SearchField (see
 * spudly/design-system's glyph-line-height test): the filter bar's first
 * control stretched to the full screen height and the search input, the select
 * triggers, and every recipe card were absent from the device's view hierarchy
 * entirely. Jest renderers do not run Yoga layout, so this test guards the
 * render-tree half of the contract — every element the screen promises must
 * actually be present in the rendered host tree — while the design-system
 * source scan pins the style half.
 */
describe('SharedWithMeView element presence (#162)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };

  test('renders the search input, all three select triggers, and the first recipe card', async () => {
    const {getByLabelText, getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(
        <SharedWithMeView
          {...controls}
          isLoading={false}
          recipes={[
            makeRecipeDetail({title: 'Shared Soup', userId: 'other-user'}),
          ]}
          isFetchingNextPage={false}
          onLoadMore={jest.fn()}
        />,
      );

    // Search input.
    expect(getByPlaceholderText('Search recipes…')).toBeTruthy();
    // Since @spudly/ui 1.15.0 this screen renders RecipesPage (the
    // SharedWithMePage consolidation), whose collapsed filter bar
    // matches the Recipes screen's: the selects live behind the
    // Filters chooser, so add each filter to render its select.
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
    // First shared recipe card: rows are links, found by label.
    expect(getByLabelText('Shared Soup')).toBeTruthy();
  });

  test('opens the recipe permalink in the browser when a row is pressed', async () => {
    const {getByLabelText} = await renderWithProviders(
      <SharedWithMeView
        {...controls}
        isLoading={false}
        recipes={[
          makeRecipeDetail({
            id: 'recipe-1',
            slug: 'shared-soup',
            title: 'Shared Soup',
            userId: 'other-user',
          }),
        ]}
        isFetchingNextPage={false}
        onLoadMore={jest.fn()}
      />,
    );

    // The row is a link whose href IS the permalink (#248): the host
    // builds it from the base-URL constant when it maps the item,
    // and the DS link hands it to Linking on press — the same
    // destination SharedRecipeListCard opened by hand before the
    // rewire (#49).
    await fireEvent.press(getByLabelText('Shared Soup'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `${WEB_APP_BASE_URL}/recipe/recipe-1/shared-soup`,
      );
    });
  });
});

/**
 * Regression test for #188, applied to this screen as well: it shares the
 * filter form, the fixed `list` shell, and the unbounded-FlatList pattern
 * RecipesListView had, so it had the same unreachable-list geometry. Jest
 * renderers do not run Yoga layout, so this pins the rendered contract — the
 * list's scroll view is bounded (flex: 1) and the filters render inside it as
 * its header, travelling with the list. The list's scroll view is the
 * RCTScrollView carrying the list content padding (spacing 4 / 8).
 */
describe('SharedWithMeView list scrollability (#188)', () => {
  const controls = {
    ...demoRecipeListFilters(),
    statusFilter: RECIPE_STATUS_FILTER_ALL as RecipeStatusFilterValue,
    onStatusFilterChange: () => undefined,
  };

  test('bounds the FlatList and renders the filters as its scrollable header', async () => {
    const {container} = await renderWithProviders(
      <SharedWithMeView
        {...controls}
        isLoading={false}
        recipes={[
          makeRecipeDetail({title: 'Shared Soup', userId: 'other-user'}),
        ]}
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
    expect(
      list.queryAll(node => node.props.placeholder === 'Search recipes…'),
    ).toHaveLength(1);
    expect(
      list.queryAll(node => node.children.includes('Shared Soup')),
    ).not.toHaveLength(0);
  });

  test('keeps the filters mounted inside the list while loading', async () => {
    const {container} = await renderWithProviders(
      <SharedWithMeView
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
  });
});
