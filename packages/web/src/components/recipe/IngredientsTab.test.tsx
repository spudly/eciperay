import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {IngredientsTab} from './IngredientsTab.js';

describe('IngredientsTab', () => {
  const onServingsChange = vi.fn();

  test('renders ingredients and adjusts servings', async () => {
    renderWithProviders(
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

  test('shows substitutions for missing ingredients', async () => {
    renderWithProviders(
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
