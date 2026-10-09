import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeCookLog, makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {RecipeListCard} from './RecipeListCard';

jest.mock('../lib/api');

const mockCreateCookLog = api.cookLogs.create as jest.Mock;

describe('RecipeListCard', () => {
  beforeEach(() => {
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('opens cook log form from list action', async () => {
    const {getByText, queryByText} = renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onPress={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Pasta')).toBeTruthy();
    fireEvent.press(getByText('Log cook'));
    expect(getByText('How did it go?')).toBeTruthy();
    fireEvent.press(getByText('Cancel'));
    expect(queryByText('How did it go?')).toBeNull();
  });

  test('saves cook log with rating from list', async () => {
    const recipe = makeRecipeDetail();
    const {getByText, getByLabelText, getByPlaceholderText, queryByText} =
      renderWithProviders(
        <RecipeListCard
          recipe={recipe}
          onPress={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

    fireEvent.press(getByText('Log cook'));
    fireEvent.press(getByLabelText('5 stars'));
    fireEvent.changeText(
      getByPlaceholderText('Notes from this cook (optional)'),
      'Weeknight favorite',
    );
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(mockCreateCookLog).toHaveBeenCalledWith(
        recipe.id,
        recipe.versionId,
        {authorStarRating: 5, notes: 'Weeknight favorite'},
      );
    });
    await waitFor(() => {
      expect(queryByText('How did it go?')).toBeNull();
    });
  });
});
