import {screen} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {StaleVersionHint} from './StaleVersionHint.js';

describe('StaleVersionHint', () => {
  test('renders warning icon with accessible label', async () => {
    await renderWithProviders(
      <StaleVersionHint label="Earlier version warning" />,
    );
    expect(
      screen.getByLabelText('Earlier version warning'),
    ).toBeInTheDocument();
  });
});
