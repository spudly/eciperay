import {act, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
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
            activeVersionId={recipe.versionId}
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

  test('deletes the recipe after the in-page confirmation and returns to the list', async () => {
    const recipe = makeRecipeDetail();
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewTab
              recipe={recipe}
              activeVersionId={recipe.versionId}
              servings={4}
              versions={[makeRecipeVersionSummary()]}
            />
          }
        />
        <Route
          path="/recipes"
          element={<div>Recipes list page</div>}
        />
      </Routes>,
      {route: '/'},
    );
    // First click only arms the confirmation (#263).
    await userEvent.click(screen.getByText('Delete'));
    expect(screen.queryByText('Recipes list page')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Confirm delete'));
    expect(await screen.findByText('Recipes list page')).toBeInTheDocument();
  });

  test('cancelling the delete confirmation keeps the recipe', async () => {
    await renderOverview();
    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
  });

  test('surfaces an error when deleting fails', async () => {
    server.use(
      http.delete('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json({error: 'Delete failed on server'}, {status: 500}),
      ),
    );
    await renderOverview();
    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Confirm delete'));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not delete recipe: Delete failed on server',
      );
    });
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  test('does not render a status badge — the detail chrome shows status once (#278)', async () => {
    await renderOverview(makeRecipeDetail({status: 'idea'}));
    expect(screen.queryByText('Idea')).not.toBeInTheDocument();
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

  test('hides edit draft link for active versions', async () => {
    await renderOverview(makeRecipeDetail({status: 'perfected'}));
    expect(screen.queryByText('Edit draft')).not.toBeInTheDocument();
  });

  test('shows edit for content-locked active versions', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewTab
              recipe={makeRecipeDetail()}
              activeVersionId={makeRecipeDetail().versionId}
              servings={4}
              versions={[makeRecipeVersionSummary()]}
            />
          }
        />
        <Route
          path="/recipes/:recipeId/edit"
          element={<div>Edit recipe page</div>}
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Edit'));
    expect(await screen.findByText('Edit recipe page')).toBeInTheDocument();
  });

  test('shows edit draft for editable draft versions', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <OverviewTab
              recipe={makeRecipeDetail({versionId: 'draft-1'})}
              activeVersionId={makeRecipeDetail().versionId}
              servings={4}
              versions={[
                makeRecipeVersionSummary({
                  id: 'draft-1',
                  derivedRole: 'draft',
                  isEditable: true,
                }),
              ]}
            />
          }
        />
        <Route
          path="/recipes/:recipeId/versions/:versionId/edit"
          element={<div>Edit draft page</div>}
        />
      </Routes>,
      {route: '/'},
    );
    await userEvent.click(screen.getByText('Edit draft'));
    expect(await screen.findByText('Edit draft page')).toBeInTheDocument();
  });
});
