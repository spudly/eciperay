import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {DevelopmentStatusBadge} from './DevelopmentStatusBadge';

describe('DevelopmentStatusBadge', () => {
  test.each([
    ['idea', 'Idea'],
    ['in_development', 'In development'],
    ['perfected', 'Perfected'],
  ] as const)('renders %s label', (status, label) => {
    render(<DevelopmentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});
