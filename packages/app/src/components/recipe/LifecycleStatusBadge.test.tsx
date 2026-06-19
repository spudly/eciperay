import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {LifecycleStatusBadge} from './LifecycleStatusBadge';

describe('LifecycleStatusBadge', () => {
  test.each([
    ['idea', 'Idea'],
    ['evolving', 'Evolving'],
    ['perfected', 'Perfected'],
    ['abandoned', 'Abandoned'],
  ] as const)('renders %s lifecycle label', (status, label) => {
    const {getByText} = renderWithProviders(
      <LifecycleStatusBadge status={status} />,
    );
    expect(getByText(label)).toBeTruthy();
  });
});
