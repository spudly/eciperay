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
    const {getByText, queryByText} = await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onPress={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Pasta')).toBeTruthy();
    await fireEvent.press(getByText('Log cook'));
    expect(getByText('How did it go?')).toBeTruthy();
    await fireEvent.press(getByText('Cancel'));
    expect(queryByText('How did it go?')).toBeNull();
  });

  test('saves cook log with rating from list', async () => {
    const recipe = makeRecipeDetail();
    const {getByText, getByLabelText, getByPlaceholderText, queryByText} =
      await renderWithProviders(
        <RecipeListCard
          recipe={recipe}
          onPress={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

    await fireEvent.press(getByText('Log cook'));
    await fireEvent.press(getByLabelText('Rate 5 out of 5 stars'));
    await fireEvent.changeText(
      getByPlaceholderText('Notes from this cook (optional)'),
      'Weeknight favorite',
    );
    await fireEvent.press(getByText('Save'));

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
