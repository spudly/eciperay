import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {IngredientsTab} from './IngredientsTab.js';

describe('IngredientsTab', () => {
  const onServingsChange = vi.fn();

  test('renders ingredients and adjusts servings', async () => {
    await renderWithProviders(
      <IngredientsTab
        recipe={makeRecipeDetail()}
        scaleFactor={1}
        servings={4}
        onServingsChange={onServingsChange}
      />,
    );
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('+'));
    expect(onServingsChange).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(3);
  });

  test('renders ingredients sorted by sort order', async () => {
    await renderWithProviders(
      <IngredientsTab
        recipe={makeRecipeDetail({
          ingredients: [
            {
              id: 'i-3',
              recipeId: 'recipe-uuid-1',
              sortOrder: 2,
              name: 'Salt',
              quantity: 1,
              unit: 'tsp',
              notes: null,
              isOptional: false,
            },
            {
              id: 'i-1',
              recipeId: 'recipe-uuid-1',
              sortOrder: 0,
              name: 'Flour',
              quantity: 2,
              unit: 'cups',
              notes: null,
              isOptional: false,
            },
            {
              id: 'i-2',
              recipeId: 'recipe-uuid-1',
              sortOrder: 1,
              name: 'Sugar',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
        })}
        scaleFactor={1}
        servings={4}
        onServingsChange={onServingsChange}
      />,
    );
    const names = screen
      .getAllByRole('button')
      .map(button => button.textContent || '')
      .filter(text => /Flour|Sugar|Salt/.test(text));
    expect(names).toEqual(['2 cups Flour', '1 cup Sugar', '1 tsp Salt']);
  });

  test('applies scale multipliers and scaled quantities', async () => {
    await renderWithProviders(
      <IngredientsTab
        recipe={makeRecipeDetail()}
        scaleFactor={2}
        servings={8}
        onServingsChange={onServingsChange}
      />,
    );
    expect(screen.getByText('4 cups Flour')).toBeInTheDocument();
    await userEvent.click(screen.getByText('2×'));
    expect(onServingsChange).toHaveBeenCalledWith(8);
  });

  test('shows substitutions for missing ingredients', async () => {
    await renderWithProviders(
      <IngredientsTab
        recipe={makeRecipeDetail()}
        scaleFactor={1}
        servings={4}
        onServingsChange={onServingsChange}
      />,
    );
    const salt = screen.getByText(/Salt/);
    await userEvent.click(salt);
    await waitFor(() => {
      expect(screen.getByText('Substitutions')).toBeInTheDocument();
    });
    await userEvent.click(salt);
    expect(screen.queryByText('Substitutions')).not.toBeInTheDocument();
  });
});
