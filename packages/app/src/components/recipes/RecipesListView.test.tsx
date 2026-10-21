import React from 'react';
import {
  RECIPE_STATUS_FILTER_ALL,
  demoRecipeListFilters,
  type RecipeStatusFilterValue,
} from '@eciperay/client';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipesListView} from './RecipesListView';

jest.mock('../../lib/api');

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
