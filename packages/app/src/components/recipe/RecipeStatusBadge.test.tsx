import {appTamaguiConfig} from '../../lib/tamaguiConfig';
import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {TamaguiProvider} from 'tamagui';

import {RecipeStatusBadge} from './RecipeStatusBadge';

const renderBadge = async (
  status?: 'idea' | 'evolving' | 'perfected' | 'abandoned',
) =>
  await render(
    <TamaguiProvider
      config={appTamaguiConfig}
      defaultTheme="light"
    >
      <RecipeStatusBadge status={status} />
    </TamaguiProvider>,
  );

describe('RecipeStatusBadge', () => {
  test.each([
    ['idea', 'Idea'],
    ['evolving', 'Evolving'],
    ['perfected', 'Perfected'],
    ['abandoned', 'Abandoned'],
  ] as const)('renders %s label', async (status, label) => {
    await renderBadge(status);
    expect(screen.getByText(label)).toBeTruthy();
  });

  test('falls back to idea for unknown status', async () => {
    await renderBadge();
    expect(screen.getByText('Idea')).toBeTruthy();
  });
});
