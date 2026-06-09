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
const onEdit = jest.fn();
const onDelete = jest.fn();

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
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(getByText('Test Cake')).toBeTruthy();
    expect(getByText('Yummy cake')).toBeTruthy();
  });

  test('calls onStartCooking when Start Cooking button pressed', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
        onEdit={onEdit}
        onDelete={onDelete}
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
        onEdit={onEdit}
        onDelete={onDelete}
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
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByText('↗'));
    expect(mockShare).toHaveBeenCalledWith(recipe);
  });

  test('calls onEdit and onDelete', () => {
    const {getByText} = render(
      <OverviewTab
        recipe={recipe}
        onStartCooking={onStartCooking}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByText('Edit'));
    fireEvent.press(getByText('Delete'));
    expect(onEdit).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });

  test('renders image when imageUrl is provided', () => {
    const recipeWithImage = makeRecipeDetail({
      imageUrl: 'https://example.com/img.jpg',
    });
    const {toJSON} = render(
      <OverviewTab
        recipe={recipeWithImage}
        onStartCooking={onStartCooking}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(JSON.stringify(toJSON())).toContain('example.com/img.jpg');
  });

  test('renders without optional fields', () => {
    const minimal = makeRecipeDetail({
      imageUrl: null,
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [],
    });
    const {getByText, queryByText} = render(
      <OverviewTab
        recipe={minimal}
        onStartCooking={onStartCooking}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(getByText('Test Recipe')).toBeTruthy();
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
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(getByText('Dinner')).toBeTruthy();
  });
});
