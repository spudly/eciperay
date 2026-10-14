import {tamaguiConfig} from '@spudly/ui';
import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {TamaguiProvider} from 'tamagui';

import {RecipeStatusBadge} from './RecipeStatusBadge';

const renderBadge = (status?: 'idea' | 'evolving' | 'perfected' | 'abandoned') =>
  render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <RecipeStatusBadge status={status} />
    </TamaguiProvider>,
  );

describe('RecipeStatusBadge', () => {
  test.each([
    ['idea', 'Idea'],
    ['evolving', 'Evolving'],
    ['perfected', 'Perfected'],
    ['abandoned', 'Abandoned'],
  ] as const)('renders %s label', (status, label) => {
    renderBadge(status);
    expect(screen.getByText(label)).toBeTruthy();
  });

  test('falls back to idea for unknown status', () => {
    renderBadge();
    expect(screen.getByText('Idea')).toBeTruthy();
  });
});
