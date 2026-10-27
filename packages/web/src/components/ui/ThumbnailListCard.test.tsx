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

  test('renders trailing actions inside the card row, not as an outside column', async () => {
    await renderWithProviders(
      <ThumbnailListCard
        title="Pasta"
        subtitle="4 servings"
        onPress={vi.fn()}
        trailing={<button type="button">Log cook</button>}
      />,
    );

    const pressable = screen.getByRole('button', {name: /Pasta/});
    const action = screen.getByRole('button', {name: /Log cook/});

    // The card surface itself contains both the pressable main region
    // and the actions (#258: the actions previously rendered outside the
    // card border as a floating column in the page margin). Asserting
    // against the card — not just the row — fails if either element
    // moves outside it. (The card surface is the pressable's
    // grandparent: card > row > pressable main region.)
    const card = pressable.parentElement?.parentElement;
    expect(card).toContainElement(pressable);
    expect(card).toContainElement(action);
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
