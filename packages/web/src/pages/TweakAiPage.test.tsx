import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {beforeEach, vi} from 'vitest';

import {server} from '../test/msw/server.js';
import {eciperay} from '../lib/api.js';
import {renderWithProviders} from '../test/testUtils.js';

import {TweakAiPage} from './TweakAiPage.js';

const PROMPT = 'e.g. make it vegetarian, reduce sugar, add more spice';

const baseSession = {
  id: 'session-1',
  recipeId: 'recipe-uuid-1',
  messages: [] as {role: 'user' | 'assistant'; content: string}[],
  approvedPlan: null,
  proposedRecipe: null,
  parentVersionId: 'version-uuid-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderTweakAi = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/recipes/:recipeId/tweak-ai"
        element={<TweakAiPage />}
      />
      <Route
        path="/recipes/:recipeId/versions/:versionId/edit"
        element={<div>Edit version</div>}
      />
      <Route
        path="/recipes/:recipeId"
        element={<div>Recipe detail</div>}
      />
    </Routes>,
    {route: '/recipes/recipe-uuid-1/tweak-ai'},
  );

describe('TweakAiPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('restores a persisted tweak session on mount', async () => {
    localStorage.setItem(
      'eciperay:tweak-ai-session-id:recipe-uuid-1',
      'session-1',
    );
    const get = vi.spyOn(eciperay.tweakAi, 'get').mockResolvedValue({
      session: {
        ...baseSession,
        phase: 'planning' as const,
        messages: [
          {role: 'user' as const, content: 'make it spicier'},
          {role: 'assistant' as const, content: 'Plan for: make it spicier'},
        ],
      },
    });
    await renderTweakAi();
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('recipe-uuid-1', 'session-1');
    get.mockRestore();
  });

  test('switching the recipe param resets the session instead of carrying it over', async () => {
    const Switcher = () => {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            void navigate('/recipes/recipe-uuid-2/tweak-ai');
          }}
        >
          switch recipe
        </button>
      );
    };
    await renderWithProviders(
      <>
        <Routes>
          <Route
            path="/recipes/:recipeId/tweak-ai"
            element={<TweakAiPage />}
          />
        </Routes>
        <Switcher />
      </>,
      {route: '/recipes/recipe-uuid-1/tweak-ai'},
    );
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    expect(
      localStorage.getItem('eciperay:tweak-ai-session-id:recipe-uuid-1'),
    ).not.toBeNull();

    // A param-only navigation reuses the page instance; the previous
    // recipe's session must neither render nor be persisted under the
    // new recipe's storage key.
    await userEvent.click(screen.getByText('switch recipe'));
    await waitFor(() => {
      expect(
        screen.queryByText(/Plan for: make it spicier/),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText(PROMPT)).toBeInTheDocument();
    expect(
      localStorage.getItem('eciperay:tweak-ai-session-id:recipe-uuid-2'),
    ).toBeNull();
  });

  test('runs the conversational tweak flow and navigates to edit page', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Approve plan'));
    expect(await screen.findByText('Cook pasta')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Save as draft'));
    expect(await screen.findByText('Edit version')).toBeInTheDocument();
  });

  test('returns to recipe detail on cancel', async () => {
    await renderTweakAi();
    await userEvent.click(screen.getByText('Cancel'));
    expect(await screen.findByText('Recipe detail')).toBeInTheDocument();
  });

  test('shows an error when planning fails', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/:id/tweak-ai-sessions', () =>
        HttpResponse.json({message: 'AI unavailable'}, {status: 500}),
      ),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    await waitFor(() => {
      expect(
        screen.getByText(
          'API error 500: /recipes/recipe-uuid-1/tweak-ai-sessions',
        ),
      ).toBeInTheDocument();
    });
    consoleError.mockRestore();
  });

  test('shows a generic error for non-error failures', async () => {
    const start = vi
      .spyOn(eciperay.tweakAi, 'start')
      .mockRejectedValueOnce('nope');
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument();
    start.mockRestore();
  });

  test('refines the plan with a follow-up message', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByPlaceholderText('Ask for changes to the plan…'),
      'add garlic',
    );
    await userEvent.click(screen.getByText('Refine plan'));
    expect(await screen.findByText(/Refined: add garlic/)).toBeInTheDocument();
  });

  test('cancels an active session', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel session'));
    expect(await screen.findByText('Recipe detail')).toBeInTheDocument();
  });

  test('shows completed session state without cancel action', async () => {
    vi.spyOn(eciperay.tweakAi, 'start').mockResolvedValueOnce({
      session: {...baseSession, phase: 'completed'},
      plan: '',
    });
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    expect(screen.queryByText('Cancel session')).not.toBeInTheDocument();
  });

  test('shows cancelled session state without cancel action', async () => {
    vi.spyOn(eciperay.tweakAi, 'start').mockResolvedValueOnce({
      session: {...baseSession, phase: 'cancelled'},
      plan: '',
    });
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    await waitFor(() => {
      expect(screen.queryByText('Cancel session')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Refine plan')).not.toBeInTheDocument();
  });

  test('shows an error when refining the plan fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    vi.spyOn(eciperay.tweakAi, 'sendMessage').mockRejectedValueOnce(
      new Error('Message failed hard'),
    );
    await userEvent.type(
      screen.getByPlaceholderText('Ask for changes to the plan…'),
      'add garlic',
    );
    await userEvent.click(screen.getByText('Refine plan'));
    expect(await screen.findByText('Message failed hard')).toBeInTheDocument();
  });

  test('shows a generic error when refining the plan fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    vi.spyOn(eciperay.tweakAi, 'sendMessage').mockRejectedValueOnce('nope');
    await userEvent.type(
      screen.getByPlaceholderText('Ask for changes to the plan…'),
      'add garlic',
    );
    await userEvent.click(screen.getByText('Refine plan'));
    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument();
  });

  test('shows an error when approving the plan fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    vi.spyOn(eciperay.tweakAi, 'approvePlan').mockRejectedValueOnce(
      new Error('Approve failed hard'),
    );
    await userEvent.click(screen.getByText('Approve plan'));
    expect(await screen.findByText('Approve failed hard')).toBeInTheDocument();
  });

  test('shows a generic error when approving the plan fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    expect(
      await screen.findByText(/Plan for: make it spicier/),
    ).toBeInTheDocument();
    vi.spyOn(eciperay.tweakAi, 'approvePlan').mockRejectedValueOnce('nope');
    await userEvent.click(screen.getByText('Approve plan'));
    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument();
  });

  test('shows an error when building the preview fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    vi.spyOn(eciperay.tweakAi, 'approvePlan').mockRejectedValueOnce(
      new Error('Implementation failed hard'),
    );
    await userEvent.click(screen.getByText('Approve plan'));
    expect(
      await screen.findByText('Implementation failed hard'),
    ).toBeInTheDocument();
  });

  test('shows a generic error when building the preview fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    vi.spyOn(eciperay.tweakAi, 'approvePlan').mockRejectedValueOnce('nope');
    await userEvent.click(screen.getByText('Approve plan'));
    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument();
  });

  test('shows an error when saving the draft fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    await userEvent.click(screen.getByText('Approve plan'));
    await screen.findByText('Cook pasta');
    vi.spyOn(eciperay.tweakAi, 'createVersion').mockRejectedValueOnce(
      new Error('Save failed hard'),
    );
    await userEvent.click(screen.getByText('Save as draft'));
    expect(await screen.findByText('Save failed hard')).toBeInTheDocument();
  });

  test('shows a generic error when saving the draft fails', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    await userEvent.click(screen.getByText('Approve plan'));
    await screen.findByText('Cook pasta');
    vi.spyOn(eciperay.tweakAi, 'createVersion').mockRejectedValueOnce('nope');
    await userEvent.click(screen.getByText('Save as draft'));
    expect(
      await screen.findByText('An unexpected error occurred'),
    ).toBeInTheDocument();
  });

  test('does not show preview when proposed recipe is invalid', async () => {
    vi.spyOn(eciperay.tweakAi, 'approvePlan').mockResolvedValueOnce({
      session: {...baseSession, phase: 'preview_ready', proposedRecipe: {}},
      changeSummary: 'AI tweak',
      preview: {
        title: '',
        servings: 0,
        ingredients: [],
        instructions: [],
        tagIds: [],
      },
    });
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(PROMPT),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Start planning'));
    await userEvent.click(screen.getByText('Approve plan'));
    await waitFor(() => {
      expect(screen.queryByText('Draft preview')).not.toBeInTheDocument();
    });
  });
});
