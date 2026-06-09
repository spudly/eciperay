import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';

import {OverviewTab} from './OverviewTab';

jest.mock('../../lib/printRecipe', () => ({
  printRecipe: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../lib/shareRecipe', () => ({
  shareRecipe: jest.fn().mockResolvedValue(null),
}));

const mockPrint = printRecipe as jest.Mock;
const mockShare = shareRecipe as jest.Mock;
const onStartCooking = jest.fn();

describe('OverviewTab', () => {
  const recipe = makeRecipeDetail({
    title: 'Test Cake',
    description: 'Yummy cake',
  });

  test('renders recipe title and description', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    expect(getByText('Test Cake')).toBeTruthy();
    expect(getByText('Yummy cake')).toBeTruthy();
  });

  test('renders stat badges for servings, prep, and cook time', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    expect(getByText(String(recipe.servings))).toBeTruthy();
  });

  test('calls onStartCooking when Start Cooking button pressed', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    fireEvent.press(getByText('Start Cooking'));
    expect(onStartCooking).toHaveBeenCalled();
  });

  test('calls printRecipe when print button pressed', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    fireEvent.press(getByText('🖨'));
    expect(mockPrint).toHaveBeenCalledWith(recipe);
  });

  test('calls shareRecipe when share button pressed', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    fireEvent.press(getByText('↗'));
    expect(mockShare).toHaveBeenCalledWith(recipe);
  });

  test('renders image when imageUrl is provided', () => {
    const recipeWithImage = makeRecipeDetail({
      imageUrl: 'https://example.com/img.jpg',
    });
    // The Image component renders when imageUrl is set; check the component tree has it
    const {toJSON} = render(
      <OverviewTab
        recipe={recipeWithImage}
        onStartCooking={onStartCooking}
      />,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('example.com/img.jpg');
  });

  test('renders prep and cook time badges when set', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
      />,
    );
    expect(getByText('15m')).toBeTruthy(); // prepTimeMin
    expect(getByText('30m')).toBeTruthy(); // cookTimeMin
  });

  test('does not render time badges when null', () => {
    const noTime = makeRecipeDetail({
      prepTimeMin: null,
      cookTimeMin: null,
      description: null,
    });
    const {queryByText} = render(
      <OverviewTab
        recipe={noTime}
        onStartCooking={onStartCooking}
      />,
    );
    expect(queryByText(/m$/)).toBeNull();
  });

  test('renders tags', () => {
    const recipeWithTag = makeRecipeDetail({
      tags: [
        {
          id: 't1',
          name: 'Dinner',
          color: '#6366f1',
          userId: null,
          isPreset: true,
        },
      ],
    });
    const {getByText} = render(
      <OverviewTab
        recipe={recipeWithTag}
        onStartCooking={onStartCooking}
      />,
    );
    expect(getByText('Dinner')).toBeTruthy();
  });
});
