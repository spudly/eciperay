import React from 'react';
import {render} from '@testing-library/react-native';

import {StaleVersionHint} from './StaleVersionHint';

describe('StaleVersionHint', () => {
  test('renders warning icon with label', async () => {
    const {getByLabelText} = await render(
      <StaleVersionHint label="Earlier version warning" />,
    );
    expect(getByLabelText('Earlier version warning')).toBeTruthy();
  });
});
