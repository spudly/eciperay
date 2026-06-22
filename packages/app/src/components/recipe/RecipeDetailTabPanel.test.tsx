import React from 'react';
import {waitFor} from '@testing-library/react-native';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {api} from '../../lib/api';

import {RecipeDetailTabPanel} from './RecipeDetailTabPanel';

jest.mock('../../lib/api');

const mockListComments = api.recipes.listComments as jest.Mock;

describe('RecipeDetailTabPanel', () => {
  beforeEach(() => {
    mockListComments.mockResolvedValue([]);
  });

  test('renders overview tab content', async () => {
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
        onEditRecipe={jest.fn()}
        onEditVersion={jest.fn()}
      />,
    );
    expect(getByText('Test Recipe')).toBeTruthy();
    await waitFor(() => {
      expect(getByText('Community rating')).toBeTruthy();
    });
  });
});
