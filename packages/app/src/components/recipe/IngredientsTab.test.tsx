import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail, VERSION_ID} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {IngredientsTab} from './IngredientsTab';

jest.mock('../../lib/api');

const mockSubstitutions = api.ai.substitutions as jest.Mock;
const onServingsChange = jest.fn();

describe('IngredientsTab', () => {
  const recipe = makeRecipeDetail();
  const defaultProps = {recipe, scaleFactor: 1, servings: 4, onServingsChange};

  beforeEach(() => {
    mockSubstitutions.mockResolvedValue([]);
  });

  test('renders ingredient list with names', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab {...defaultProps} />,
    );
    expect(getByText(/Flour/)).toBeTruthy();
  });

  test('ServingsStepper increment calls onServingsChange with servings + 1', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab {...defaultProps} />,
    );
    await fireEvent.press(getByText('+'));
    expect(onServingsChange).toHaveBeenCalledWith(5);
  });

  test('ServingsStepper decrement calls onServingsChange with servings - 1', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab {...defaultProps} />,
    );
    await fireEvent.press(getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(3);
  });

  test('decrement stops at 1 serving minimum', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab
        {...defaultProps}
        servings={1}
      />,
    );
    await fireEvent.press(getByText('−'));
    // Verify onChange was not called with a value below the minimum (1)
    const calls = onServingsChange.mock.calls;
    for (const call of calls) {
      expect(call[0]).toBeGreaterThanOrEqual(1);
    }
  });

  test('applies scale multipliers', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab
        {...defaultProps}
        servings={4}
      />,
    );
    await fireEvent.press(getByText('3×'));
    expect(onServingsChange).toHaveBeenCalledWith(12);
  });

  test('shows scaled ingredient quantities', async () => {
    const {getByText} = await renderWithProviders(
      <IngredientsTab
        {...defaultProps}
        scaleFactor={2}
        servings={8}
      />,
    );
    expect(getByText('4 cups Flour')).toBeTruthy();
  });

  test('tap marks ingredient missing and shows substitutions', async () => {
    mockSubstitutions.mockResolvedValue([
      {ingredient: 'Salt', suggestions: ['Soy sauce']},
    ]);
    const {getAllByText, findByText} = await renderWithProviders(
      <IngredientsTab {...defaultProps} />,
    );
    await fireEvent.press(getAllByText(/Salt/)[0]);
    expect(await findByText('Substitutions')).toBeTruthy();
    expect(mockSubstitutions).toHaveBeenCalled();
  });

  test('tapping missing ingredient again removes it from set', async () => {
    const {getAllByText, queryByText} = await renderWithProviders(
      <IngredientsTab {...defaultProps} />,
    );
    await fireEvent.press(getAllByText(/Flour/)[0]);
    expect(queryByText(/Tap an ingredient/)).toBeTruthy();
    await fireEvent.press(getAllByText(/Flour/)[0]);
    expect(queryByText(/Tap an ingredient/)).toBeNull();
  });

  test('shows optional label for optional ingredients', async () => {
    const optionalRecipe = makeRecipeDetail({
      ingredients: [
        {
          id: 'i-opt',
          recipeVersionId: VERSION_ID,
          sortOrder: 0,
          name: 'Nuts',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: true,
        },
      ],
    });
    const {getByText} = await renderWithProviders(
      <IngredientsTab
        recipe={optionalRecipe}
        scaleFactor={1}
        servings={4}
        onServingsChange={onServingsChange}
      />,
    );
    expect(getByText('optional')).toBeTruthy();
  });
});
