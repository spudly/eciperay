import {render, screen} from '@testing-library/react';
import type {RecipeVersionInput} from '@eciperay/types';

import {RecipeInputPreview} from './RecipeInputPreview.js';

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
      sortOrder: 1,
      name: 'pasta',
      quantity: 400,
      unit: 'g',
      notes: null,
      isOptional: false,
    },
    {
      sortOrder: 0,
      name: 'cream',
      quantity: 200,
      unit: 'ml',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [
    {stepNumber: 2, body: 'Serve'},
    {stepNumber: 1, body: 'Cook'},
  ],
  tagIds: [],
};

describe('RecipeInputPreview', () => {
  test('renders recipe metadata, ingredients, and instructions', () => {
    render(<RecipeInputPreview recipe={recipe} />);
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByText('Creamy pasta')).toBeInTheDocument();
    expect(screen.getByText(/Serves 4/)).toBeInTheDocument();
    expect(screen.getByText(/Prep 10 min/)).toBeInTheDocument();
    expect(screen.getByText(/Cook 20 min/)).toBeInTheDocument();
    expect(screen.getByText(/cream/)).toBeInTheDocument();
    expect(screen.getByText('Cook')).toBeInTheDocument();
    expect(screen.getByText('Serve')).toBeInTheDocument();
  });

  test('omits optional sections when empty', () => {
    render(
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
    expect(screen.getByText('Soup')).toBeInTheDocument();
    expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
    expect(screen.queryByText('Instructions')).not.toBeInTheDocument();
  });
});
