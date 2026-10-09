import {
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_TITLE,
} from '@eciperay/client';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {HomeView} from './HomeView.js';

describe('HomeView', () => {
  test('renders welcome content and empty state', async () => {
    await renderWithProviders(
      <HomeView
        isLoading={false}
        recipes={[]}
        onBrowsePress={vi.fn()}
        onAddPress={vi.fn()}
        onSharedWithMePress={vi.fn()}
        onRecipePress={vi.fn()}
        onRecipeDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(HOME_TITLE)).toBeInTheDocument();
    expect(screen.getByText(HOME_BROWSE_LABEL)).toBeInTheDocument();
    expect(screen.getByText(HOME_EMPTY_MESSAGE)).toBeInTheDocument();
  });

  test('calls browse callback when browse action is clicked', async () => {
    const user = userEvent.setup();
    const onBrowsePress = vi.fn();

    await renderWithProviders(
      <HomeView
        isLoading={false}
        recipes={[]}
        onBrowsePress={onBrowsePress}
        onAddPress={vi.fn()}
        onSharedWithMePress={vi.fn()}
        onRecipePress={vi.fn()}
        onRecipeDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText(HOME_BROWSE_LABEL));
    expect(onBrowsePress).toHaveBeenCalledTimes(1);
  });

  test('renders recently viewed recipes', async () => {
    await renderWithProviders(
      <HomeView
        isLoading={false}
        recipes={[makeRecipeDetail({id: 'recipe-1', title: 'Soup'})]}
        onBrowsePress={vi.fn()}
        onAddPress={vi.fn()}
        onSharedWithMePress={vi.fn()}
        onRecipePress={vi.fn()}
        onRecipeDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Soup')).toBeInTheDocument();
    expect(screen.getByText('Log cook')).toBeInTheDocument();
  });
});
