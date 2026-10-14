import {tamaguiConfig} from '@spudly/ui';
import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {TamaguiProvider} from 'tamagui';

import {RecipeDetailTabBar} from './RecipeDetailTabBar';

const renderTabBar = (
  activeTab: 'overview' | 'ingredients',
  onSelect: (tab: string) => void = jest.fn(),
) =>
  render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <RecipeDetailTabBar activeTab={activeTab} onSelect={onSelect} />
    </TamaguiProvider>,
  );

describe('RecipeDetailTabBar', () => {
  test('renders all recipe detail tabs', () => {
    const {getByText} = renderTabBar('overview');
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Ingredients')).toBeTruthy();
    expect(getByText('Instructions')).toBeTruthy();
    expect(getByText('Cook History')).toBeTruthy();
    expect(getByText('Nutrition')).toBeTruthy();
  });

  test('calls onSelect when a tab is pressed', () => {
    const onSelect = jest.fn();
    const {getByText} = renderTabBar('overview', onSelect);
    fireEvent.press(getByText('Ingredients'));
    expect(onSelect).toHaveBeenCalledWith('ingredients');
  });

  test('visually distinguishes the active tab', () => {
    const {getByText} = renderTabBar('ingredients');
    // The design-system Tabs bolds the active tab's label.
    expect(getByText('Ingredients').props.style).toMatchObject({
      fontWeight: 600,
    });
    expect(getByText('Overview').props.style).toMatchObject({
      fontWeight: 400,
    });
  });
});
