import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {ScrollView} from 'react-native';

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

  test('uses a horizontal scroll view so tabs are not cramped', () => {
    const {UNSAFE_getByType} = render(
      <RecipeDetailTabBar
        activeTab="overview"
        onSelect={jest.fn()}
      />,
    );
    expect(UNSAFE_getByType(ScrollView).props.horizontal).toBe(true);
  });
});
