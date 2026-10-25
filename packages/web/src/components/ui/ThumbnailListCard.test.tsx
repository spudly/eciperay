import {screen} from '@testing-library/react';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {ThumbnailListCard} from './ThumbnailListCard.js';

describe('ThumbnailListCard', () => {
  test('shows a pointer cursor on the onPress card', async () => {
    await renderWithProviders(
      <ThumbnailListCard
        title="Pasta"
        subtitle="4 servings"
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: /Pasta/})).toHaveStyle({
      cursor: 'pointer',
    });
  });

  test('shows a pointer cursor on the onPress card beside trailing actions', async () => {
    await renderWithProviders(
      <ThumbnailListCard
        title="Pasta"
        subtitle="4 servings"
        onPress={vi.fn()}
        trailing={<button type="button">Log cook</button>}
      />,
    );

    expect(screen.getByRole('button', {name: /Pasta/})).toHaveStyle({
      cursor: 'pointer',
    });
  });

  test('shows a pointer cursor on the linkTo link', async () => {
    await renderWithProviders(
      <ThumbnailListCard
        title="Pasta"
        subtitle="4 servings"
        linkTo="/recipes/1"
      />,
    );

    expect(screen.getByRole('link', {name: /Pasta/})).toHaveStyle({
      cursor: 'pointer',
    });
  });
});
