import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';

import {IngredientsTab} from './IngredientsTab';

const onServingsChange = jest.fn();

describe('IngredientsTab', () => {
  const recipe = makeRecipeDetail();
  const defaultProps = {recipe, scaleFactor: 1, servings: 4, onServingsChange};

  test('renders ingredient list with names', () => {
    const {getByText} = render(<IngredientsTab {...defaultProps} />);
    expect(getByText(/Flour/)).toBeTruthy();
  });

  test('ServingsStepper increment calls onServingsChange with servings + 1', () => {
    const {getByText} = render(<IngredientsTab {...defaultProps} />);
    fireEvent.press(getByText('+'));
    expect(onServingsChange).toHaveBeenCalledWith(5);
  });

  test('ServingsStepper decrement calls onServingsChange with servings - 1', () => {
    const {getByText} = render(<IngredientsTab {...defaultProps} />);
    fireEvent.press(getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(3);
  });

  test('decrement stops at 1 serving minimum', () => {
    const {getByText} = render(
      <IngredientsTab
        {...defaultProps}
        servings={1}
      />,
    );
    fireEvent.press(getByText('−'));
    expect(onServingsChange).toHaveBeenCalledWith(1);
  });

  test('long-press marks ingredient as missing and shows help text', () => {
    const {getByText} = render(<IngredientsTab {...defaultProps} />);
    fireEvent(getByText(/Flour/), 'longPress');
    expect(getByText(/Long-press an ingredient/)).toBeTruthy();
  });

  test('shows "optional" label for optional ingredients', () => {
    const recipe = makeRecipeDetail({
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
      <IngredientsTab
        recipe={recipe}
        scaleFactor={1}
        servings={4}
        onServingsChange={onServingsChange}
      />,
    );
    expect(getByText('optional')).toBeTruthy();
  });

  test('long-pressing again removes ingredient from missing set', () => {
    const {getByText, queryByText} = render(
      <IngredientsTab {...defaultProps} />,
    );
    fireEvent(getByText(/Flour/), 'longPress');
    expect(getByText(/Long-press an ingredient/)).toBeTruthy();
    fireEvent(getByText(/Flour/), 'longPress');
    expect(queryByText(/Long-press an ingredient/)).toBeNull();
  });
});
