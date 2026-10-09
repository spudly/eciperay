import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

import {ShoppingListScreen} from './ShoppingListScreen';

jest.mock('../lib/api');

const mockShoppingList = api.mealPlans.shoppingList as jest.Mock;
const planId = '00000000-0000-4000-8000-000000000003';
const stackProps = makeStackProps<MealsStackParamList, 'ShoppingList'>(
  'ShoppingList',
  {planId},
  {},
);

describe('ShoppingListScreen', () => {
  beforeEach(() => {
    mockShoppingList.mockResolvedValue([
      {
        key: 'flour',
        name: 'Flour',
        quantity: 2,
        unit: 'cups',
        isOptional: false,
        sources: [],
      },
    ]);
  });

  test('renders shopping list lines', async () => {
    const {findByText} = renderWithProviders(
      <ShoppingListScreen {...stackProps} />,
    );
    expect(await findByText('Shopping list')).toBeTruthy();
    expect(await findByText('Flour')).toBeTruthy();
  });

  test('toggles checked state', async () => {
    const {findByText} = renderWithProviders(
      <ShoppingListScreen {...stackProps} />,
    );
    const row = await findByText('Flour');
    fireEvent.press(row);
    fireEvent.press(row);
    expect(row).toBeTruthy();
  });
});
