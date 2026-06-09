import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';

import {InstructionsTab} from './InstructionsTab';

describe('InstructionsTab', () => {
  const recipe = makeRecipeDetail();

  test('renders all instruction steps', () => {
    const {getByText} = render(<InstructionsTab recipe={recipe} />);
    expect(getByText('Mix dry ingredients')).toBeTruthy();
    expect(getByText('Bake at 350°F')).toBeTruthy();
  });

  test('first step is active by default', () => {
    const {getByText} = render(<InstructionsTab recipe={recipe} />);
    expect(getByText('Step 1')).toBeTruthy();
  });

  test('pressing a step card makes it active', () => {
    const {getByText} = render(<InstructionsTab recipe={recipe} />);
    fireEvent.press(getByText('Bake at 350°F'));
    expect(getByText('Step 2')).toBeTruthy();
  });
});
