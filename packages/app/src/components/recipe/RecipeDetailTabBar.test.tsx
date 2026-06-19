import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';

import {RecipeDetailTabBar} from './RecipeDetailTabBar';

describe('RecipeDetailTabBar', () => {
  test('renders all recipe detail tabs', () => {
    const {getByText} = render(
      <RecipeDetailTabBar
        activeTab="overview"
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Ingredients')).toBeTruthy();
    expect(getByText('Instructions')).toBeTruthy();
    expect(getByText('Cook History')).toBeTruthy();
    expect(getByText('Nutrition')).toBeTruthy();
  });

  test('calls onSelect when a tab is pressed', () => {
    const onSelect = jest.fn();
    const {getByText} = render(
      <RecipeDetailTabBar
        activeTab="overview"
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByText('Ingredients'));
    expect(onSelect).toHaveBeenCalledWith('ingredients');
  });
});
