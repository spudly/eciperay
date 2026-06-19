import {act, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';
import * as printRecipeModule from '../../lib/printRecipe.js';
import * as shareRecipeModule from '../../lib/shareRecipe.js';

import {OverviewTab} from './OverviewTab.js';

vi.mock('../../lib/printRecipe.js', () => ({printRecipe: vi.fn()}));
vi.mock('../../lib/shareRecipe.js', () => ({
  shareRecipe: vi.fn().mockResolvedValue('copied'),
}));

const renderOverview = (recipe = makeRecipeDetail()) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/"
        element={
          <OverviewTab
            recipe={recipe}
            servings={4}
            versions={[makeRecipeVersionSummary()]}
          />
        }
      />
    </Routes>,
    {route: '/'},
  );

describe('OverviewTab', () => {
  test('renders recipe details and actions', async () => {
    const recipe = makeRecipeDetail({imageUrl: 'https://example.com/img.jpg'});
    await renderOverview(recipe);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('A test recipe')).toBeInTheDocument();
    expect(screen.getByText('Start Cooking')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    await userEvent.click(screen.getByText('🖨'));
    expect(printRecipeModule.printRecipe).toHaveBeenCalledWith(recipe);
    await userEvent.click(screen.getByLabelText('Share recipe'));
    expect(shareRecipeModule.shareRecipe).toHaveBeenCalledWith(recipe);
    expect(
      await screen.findByText('Recipe copied to clipboard'),
    ).toBeInTheDocument();
  });

  test('shows a shared confirmation message', async () => {
    vi.mocked(shareRecipeModule.shareRecipe).mockResolvedValueOnce('shared');
    await renderOverview();
    await userEvent.click(screen.getByLabelText('Share recipe'));
    expect(await screen.findByText('Recipe shared')).toBeInTheDocument();
  });

  test('ignores share cancellation', async () => {
    vi.mocked(shareRecipeModule.shareRecipe).mockRejectedValueOnce(
      new DOMException('cancelled', 'AbortError'),
    );
    await renderOverview();
    await userEvent.click(screen.getByLabelText('Share recipe'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('shows an error when sharing fails', async () => {
    vi.mocked(shareRecipeModule.shareRecipe).mockRejectedValueOnce(
      new Error('share failed'),
    );
    await renderOverview();
    await userEvent.click(screen.getByLabelText('Share recipe'));
    expect(
      await screen.findByText('Could not share recipe'),
    ).toBeInTheDocument();
  });

  test('clears the action message after a delay', async () => {
    let clearMessage: (() => void) | undefined;
    const realSetTimeout = window.setTimeout.bind(window);
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      delay?: number,
    ) => {
      if (delay === 2500) {
        clearMessage = handler as () => void;
        return 0;
      }
      return realSetTimeout(handler, delay ?? 0);
    }) as typeof window.setTimeout);
    await renderOverview();
    await userEvent.click(screen.getByLabelText('Share recipe'));
    expect(
      await screen.findByText('Recipe copied to clipboard'),
    ).toBeInTheDocument();
    await act(async () => {
      clearMessage?.();
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    setTimeoutSpy.mockRestore();
  });

  test('renders without optional fields', async () => {
    const recipe = makeRecipeDetail({
      imageUrl: null,
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [],
    });
    await renderOverview(recipe);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.queryByText('A test recipe')).not.toBeInTheDocument();
  });

  test('hides edit link for perfected recipes', async () => {
    await renderOverview(makeRecipeDetail({lifecycleStatus: 'perfected'}));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
