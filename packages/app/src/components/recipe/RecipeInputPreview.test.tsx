import React from 'react';
import {render} from '@testing-library/react-native';
import type {RecipeVersionInput} from '@eciperay/types';

import {RecipeInputPreview} from './RecipeInputPreview';

const recipe: RecipeVersionInput = {
  title: 'Pasta',
  description: 'Creamy pasta',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  imageUrl: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'cream',
      quantity: 200,
      unit: 'ml',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Cook'}],
  tagIds: [],
};

describe('RecipeInputPreview', () => {
  test('renders recipe preview content', async () => {
    const {getByText} = await render(<RecipeInputPreview recipe={recipe} />);
    expect(getByText('Pasta')).toBeTruthy();
    expect(getByText('Creamy pasta')).toBeTruthy();
    expect(getByText(/Serves 4/)).toBeTruthy();
    expect(getByText(/cream/)).toBeTruthy();
    expect(getByText('1. Cook')).toBeTruthy();
  });

  test('omits optional metadata in preview', async () => {
    const {getByText, queryByText} = await render(
      <RecipeInputPreview
        recipe={{
          title: 'Soup',
          servings: 2,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
      />,
    );
    expect(getByText('Soup')).toBeTruthy();
    expect(getByText('Serves 2')).toBeTruthy();
    expect(queryByText(/Prep/)).toBeNull();
    expect(queryByText(/Cook/)).toBeNull();
  });
});
