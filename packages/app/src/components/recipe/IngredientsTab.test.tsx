import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
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

  test('renders ingredient list with names', () => {
    const {getByText} = render(
      renderWithProviders(<IngredientsTab {...defaultProps} />),
    );
    expect(getByText(/Flour/)).toBeTruthy();
  });

  test('ServingsStepper increment calls onServingsChange with servings + 1', () => {
    const {getByText} = render(
      renderWithProviders(<IngredientsTab {...defaultProps} />),
    );
    fireEvent.press(getByText('+'));
    expect(onServingsChange).toHaveBeenCalledWith(5);
  });

  test('ServingsStepper decrement calls onServingsChange with servings - 1', () => {
    const {getByText} = render(
      renderWithProviders(<IngredientsTab {...defaultProps} />),
    );
    fireEvent.press(getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(3);
  });

  test('decrement stops at 1 serving minimum', () => {
    const {getByText} = render(
      renderWithProviders(
        <IngredientsTab
          {...defaultProps}
          servings={1}
        />,
      ),
    );
    fireEvent.press(getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(1);
  });

  test('tap marks ingredient missing and shows substitutions', async () => {
    mockSubstitutions.mockResolvedValue([
      {ingredient: 'Salt', suggestions: ['Soy sauce']},
    ]);
    const {getAllByText, findByText} = render(
      renderWithProviders(<IngredientsTab {...defaultProps} />),
    );
    fireEvent.press(getAllByText(/Salt/)[0]);
    expect(await findByText('Substitutions')).toBeTruthy();
    expect(mockSubstitutions).toHaveBeenCalled();
  });

  test('tapping missing ingredient again removes it from set', () => {
    const {getAllByText, queryByText} = render(
      renderWithProviders(<IngredientsTab {...defaultProps} />),
    );
    fireEvent.press(getAllByText(/Flour/)[0]);
    expect(queryByText(/Tap an ingredient/)).toBeTruthy();
    fireEvent.press(getAllByText(/Flour/)[0]);
    expect(queryByText(/Tap an ingredient/)).toBeNull();
  });

  test('shows optional label for optional ingredients', () => {
    const optionalRecipe = makeRecipeDetail({
      ingredients: [
        {
          id: 'i-opt',
          recipeId: 'r-1',
          sortOrder: 0,
          name: 'Nuts',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: true,
        },
      ],
    });
    const {getByText} = render(
      renderWithProviders(
        <IngredientsTab
          recipe={optionalRecipe}
          scaleFactor={1}
          servings={4}
          onServingsChange={onServingsChange}
        />,
      ),
    );
    expect(getByText('optional')).toBeTruthy();
  });
});
