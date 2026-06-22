import {screen} from '@testing-library/react';

import {renderWithProviders} from '../../test/testUtils.js';

import {DevelopmentStatusBadge} from './DevelopmentStatusBadge.js';

describe('DevelopmentStatusBadge', () => {
  test('renders the development status label', async () => {
    await renderWithProviders(
      <DevelopmentStatusBadge status="in_development" />,
    );
    expect(screen.getByText('In development')).toBeInTheDocument();
  });
});
