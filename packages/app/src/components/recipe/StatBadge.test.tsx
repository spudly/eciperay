import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {StatBadge} from './StatBadge';

describe('StatBadge', () => {
  test('renders label and value', () => {
    const {getByText} = renderWithProviders(
      <StatBadge
        label="Servings"
        value="4"
      />,
    );
    expect(getByText('4')).toBeTruthy();
    expect(getByText('Servings')).toBeTruthy();
  });
});
