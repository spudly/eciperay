import React from 'react';
import {
  RECIPE_STATUS_FILTER_ALL,
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
    const {getByPlaceholderText, getByText} = await renderWithProviders(
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
    // The three select triggers: label + currently selected value.
    expect(getByText('Status')).toBeTruthy();
    expect(getByText('All statuses')).toBeTruthy();
    expect(getByText('Sort by')).toBeTruthy();
    expect(getByText('Newest')).toBeTruthy();
    expect(getByText('Order')).toBeTruthy();
    expect(getByText('High to low')).toBeTruthy();
    // First shared recipe card.
    expect(getByText('Shared Soup')).toBeTruthy();
  });
});
