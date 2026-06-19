import React from 'react';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeDetailTabPanel} from './RecipeDetailTabPanel';

jest.mock('../../lib/api');

describe('RecipeDetailTabPanel', () => {
  test('renders overview tab content', () => {
    const recipe = makeRecipeDetail();
    const {getByText} = renderWithProviders(
      <RecipeDetailTabPanel
        activeTab="overview"
        recipe={recipe}
        displayRecipe={recipe}
        versions={[makeRecipeVersionSummary()]}
        currentServings={4}
        scaleFactor={1}
        onServingsChange={jest.fn()}
        onStartCooking={jest.fn()}
        onDelete={jest.fn()}
        onTweakAi={jest.fn()}
        onViewVersion={jest.fn()}
        onEditVersion={jest.fn()}
      />,
    );
    expect(getByText('Test Recipe')).toBeTruthy();
  });
});
