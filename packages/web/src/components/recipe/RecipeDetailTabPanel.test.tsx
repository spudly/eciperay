import {screen} from '@testing-library/react';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeDetailTabPanel} from './RecipeDetailTabPanel.js';

const baseProps = {
  recipe: makeRecipeDetail(),
  displayRecipe: makeRecipeDetail(),
  versions: [makeRecipeVersionSummary()],
  currentServings: 4,
  scaleFactor: 1,
  onServingsChange: () => {},
};

describe('RecipeDetailTabPanel', () => {
  test('renders overview tab content', async () => {
    await renderWithProviders(
      <RecipeDetailTabPanel
        {...baseProps}
        activeTab="overview"
      />,
    );
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  test('renders ingredients tab content', async () => {
    await renderWithProviders(
      <RecipeDetailTabPanel
        {...baseProps}
        activeTab="ingredients"
      />,
    );
    expect(screen.getByText(/Flour/)).toBeInTheDocument();
  });

  test('renders instructions tab content', async () => {
    await renderWithProviders(
      <RecipeDetailTabPanel
        {...baseProps}
        activeTab="instructions"
      />,
    );
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
  });

  test('renders history tab content', async () => {
    await renderWithProviders(
      <RecipeDetailTabPanel
        {...baseProps}
        activeTab="history"
      />,
    );
    expect(await screen.findByText('Turned out great')).toBeInTheDocument();
  });

  test('renders nutrition tab content', async () => {
    await renderWithProviders(
      <RecipeDetailTabPanel
        {...baseProps}
        activeTab="nutrition"
      />,
    );
    expect(await screen.findByText('250')).toBeInTheDocument();
  });
});
