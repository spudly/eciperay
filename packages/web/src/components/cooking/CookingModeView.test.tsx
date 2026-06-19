import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {CookingModeView} from './CookingModeView.js';

describe('CookingModeView', () => {
  test('renders step content and navigation', async () => {
    const recipe = makeRecipeDetail();
    const onDone = vi.fn();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    await renderWithProviders(
      <CookingModeView
        displayRecipe={recipe}
        steps={recipe.instructions}
        step={0}
        scaleFactor={1}
        servings={4}
        onDone={onDone}
        onPrev={onPrev}
        onNext={onNext}
      />,
    );
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Next →'));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Done'));
    expect(onDone).toHaveBeenCalled();
  });
});
