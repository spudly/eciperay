import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

import {GenerateAiPage} from './GenerateAiPage.js';

const {
  mockStart,
  mockGet,
  mockApprovePlan,
  mockCreateRecipe,
  mockSendMessage,
  mockCancel,
  mockTrack,
} = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockGet: vi.fn(),
  mockApprovePlan: vi.fn(),
  mockCreateRecipe: vi.fn(),
  mockSendMessage: vi.fn(),
  mockCancel: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock('../lib/api.js', () => ({
  eciperay: {
    createAi: {
      start: mockStart,
      get: mockGet,
      sendMessage: mockSendMessage,
      approvePlan: mockApprovePlan,
      createRecipe: mockCreateRecipe,
      cancel: mockCancel,
    },
  },
}));

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    useAnalytics: () => ({track: mockTrack, platform: 'web'}),
    invalidateRecipeQueries: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

const session = {
  id: 'session-1',
  phase: 'planning' as const,
  messages: [
    {role: 'user' as const, content: 'cookies'},
    {role: 'assistant' as const, content: 'Plan for cookies'},
  ],
  approvedPlan: null,
  proposedRecipe: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('GenerateAiPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStart.mockReset();
    mockGet.mockReset();
    mockApprovePlan.mockReset();
    mockCreateRecipe.mockReset();
    mockSendMessage.mockReset();
    mockCancel.mockReset();
    mockTrack.mockReset();
    mockNavigate.mockReset();
  });

  test('starts session planning flow', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        'simple chocolate chip cookies for 12',
      );
    });
    expect(
      screen.getByRole('button', {name: 'Approve plan'}),
    ).toBeInTheDocument();
  });

  test('saves recipe after preview and navigates to review', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockApprovePlan.mockResolvedValue({
      session: {
        ...session,
        phase: 'preview_ready',
        proposedRecipe: {
          title: 'Cookies',
          servings: 12,
          ingredients: [],
          instructions: [],
          tagIds: [],
        },
      },
      changeSummary: 'AI recipe',
      preview: {
        title: 'Cookies',
        servings: 12,
        ingredients: [],
        instructions: [],
      },
    });
    mockCreateRecipe.mockResolvedValue({
      recipeId: 'recipe-ai-1',
      versionId: 'version-uuid-1',
      recipe: {id: 'recipe-ai-1'},
    });
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await user.click(await screen.findByRole('button', {name: 'Approve plan'}));
    await user.click(await screen.findByRole('button', {name: 'Save recipe'}));
    await waitFor(() => {
      expect(mockCreateRecipe).toHaveBeenCalledWith('session-1');
    });
    expect(mockTrack).toHaveBeenCalledWith('recipe_imported', {
      recipe_id: 'recipe-ai-1',
      source: 'ai',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/import/review/recipe-ai-1', {
      state: {recipe: {id: 'recipe-ai-1'}},
    });
  });

  test('persists the active session id and restores the session on remount', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockGet.mockResolvedValue({session});
    const user = userEvent.setup();
    const first = await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await screen.findByRole('button', {name: 'Approve plan'});
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-1',
    );
    first.unmount();

    // Navigating away and back remounts the page: the stored id is
    // re-fetched and the in-progress session (prompt + plan) returns.
    await renderWithProviders(<GenerateAiPage />);
    expect(
      await screen.findByRole('button', {name: 'Approve plan'}),
    ).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('session-1');
    expect(screen.getByText('Plan for cookies')).toBeInTheDocument();
  });

  test('restores a session whose start finishes after navigating away and back', async () => {
    // The start request stays pending while the user leaves and
    // returns: no session id exists yet, so the remounted page must
    // adopt the in-flight start instead of sitting on the empty form.
    let resolveStart!: (value: unknown) => void;
    mockStart.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveStart = resolve;
        }),
    );
    mockGet.mockResolvedValue({session});
    const user = userEvent.setup();
    const first = await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
    first.unmount();
    await renderWithProviders(<GenerateAiPage />);
    // The remounted host adopted the shared start: it shows the pending
    // state (pending label, start control disabled) until it resolves,
    // so no second submission can slip in meanwhile.
    const pendingButton = screen.getByRole('button', {name: 'Planning…'});
    expect(pendingButton).toBeDisabled();
    resolveStart({session, plan: 'Plan for cookies'});
    expect(
      await screen.findByRole('button', {name: 'Approve plan'}),
    ).toBeInTheDocument();
    expect(screen.getByText('Plan for cookies')).toBeInTheDocument();
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-1',
    );
    // Adoption never starts a second session; the adopted session is
    // displayed only via the owner-scoped restore fetch by id, so a
    // start begun under another account is never shown directly.
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('session-1');
  });

  test('does not show an adopted start owned by another account', async () => {
    // The shared in-flight start survives a sign-out/sign-in switch in
    // the same SPA (its map is module-level). If the account that is
    // now signed in does not own the adopted session, the owner-scoped
    // restore 404s and the session must never be displayed.
    let resolveStart!: (value: unknown) => void;
    mockStart.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveStart = resolve;
        }),
    );
    mockGet.mockRejectedValue(new Error('Session not found'));
    const user = userEvent.setup();
    const first = await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
    first.unmount();
    await renderWithProviders(<GenerateAiPage />);
    resolveStart({session, plan: 'Plan for cookies'});
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('session-1');
    });
    // The definitive not-found drops the adopted id and the page stays
    // on the fresh form — the other account's plan is never rendered.
    await waitFor(() => {
      expect(localStorage.getItem('eciperay:create-ai-session-id')).toBeNull();
    });
    expect(screen.queryByText('Plan for cookies')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
    ).toBeInTheDocument();
  });

  test('a late-finishing earlier start does not overwrite a newer session', async () => {
    const newerSession = {
      ...session,
      id: 'session-2',
      messages: [
        {role: 'user' as const, content: 'pasta'},
        {role: 'assistant' as const, content: 'Plan for pasta'},
      ],
    };
    let resolveEarlier!: (value: unknown) => void;
    mockStart
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveEarlier = resolve;
          }),
      )
      .mockResolvedValue({session: newerSession, plan: 'Plan for pasta'});
    const user = userEvent.setup();
    // Two hosts of the same flow mounted at once: the first begins a
    // start that stays pending; the second begins (and finishes) a
    // newer start. When the earlier start finally resolves, it must
    // not replace the newer session or its stored restore id.
    const first = await renderWithProviders(<GenerateAiPage />);
    const second = await renderWithProviders(<GenerateAiPage />);
    const firstUi = within(first.container);
    const secondUi = within(second.container);
    await user.type(
      firstUi.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(firstUi.getByRole('button', {name: 'Start planning'}));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
    await user.type(
      secondUi.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'weeknight pasta',
    );
    await user.click(secondUi.getByRole('button', {name: 'Start planning'}));
    expect(await secondUi.findByText('Plan for pasta')).toBeInTheDocument();
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-2',
    );
    resolveEarlier({session, plan: 'Plan for cookies'});
    // Wait until the earlier start's completion has actually been
    // processed: its host leaves the pending state and its Start
    // planning button reappears. (Asserting the stored id here would
    // be vacuous — it already held 'session-2' before the resolve.)
    await waitFor(() => {
      expect(
        firstUi.getByRole('button', {name: 'Start planning'}),
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-2',
    );
    expect(secondUi.getByText('Plan for pasta')).toBeInTheDocument();
    expect(firstUi.queryByText('Plan for cookies')).not.toBeInTheDocument();
  });

  test('drops a stored session id that no longer resolves', async () => {
    localStorage.setItem('eciperay:create-ai-session-id', 'session-gone');
    mockGet.mockRejectedValue(new Error('Session not found'));
    await renderWithProviders(<GenerateAiPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('session-gone');
    });
    await waitFor(() => {
      expect(localStorage.getItem('eciperay:create-ai-session-id')).toBeNull();
    });
    expect(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
    ).toBeInTheDocument();
  });

  test('restore never serves cached query data from a previous account', async () => {
    localStorage.setItem('eciperay:create-ai-session-id', 'session-1');
    // Poison the shared QueryClient cache under the restore key with a
    // different session, as a previous account's restore could have left
    // behind before a sign-out/sign-in switch in the same tab.
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      ['aiSessionRestore', 'eciperay:create-ai-session-id', 'session-1'],
      {
        session: {
          ...session,
          messages: [
            {role: 'assistant' as const, content: 'CACHED FOREIGN PLAN'},
          ],
        },
      },
    );
    mockGet.mockResolvedValue({session});
    await renderWithProviders(<GenerateAiPage />, {queryClient});
    expect(
      await screen.findByRole('button', {name: 'Approve plan'}),
    ).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('session-1');
    expect(screen.getByText('Plan for cookies')).toBeInTheDocument();
    expect(screen.queryByText('CACHED FOREIGN PLAN')).not.toBeInTheDocument();
  });

  test('keeps the stored session id after a transient restore failure', async () => {
    localStorage.setItem('eciperay:create-ai-session-id', 'session-1');
    mockGet.mockRejectedValue(
      new Error('API error 500: /recipes/import/ai/sessions/session-1'),
    );
    await renderWithProviders(<GenerateAiPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('session-1');
    });
    // The id survives so a later visit can retry the restore; the page
    // still shows the fresh form for this visit.
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-1',
    );
    expect(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
    ).toBeInTheDocument();
  });

  test('does not restore a stored session that already finished', async () => {
    localStorage.setItem('eciperay:create-ai-session-id', 'session-1');
    mockGet.mockResolvedValue({session: {...session, phase: 'completed'}});
    await renderWithProviders(<GenerateAiPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('session-1');
    });
    await waitFor(() => {
      expect(localStorage.getItem('eciperay:create-ai-session-id')).toBeNull();
    });
    expect(screen.queryByText('Plan for cookies')).not.toBeInTheDocument();
  });

  test('refining an older session does not overwrite a newer stored id', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockSendMessage.mockResolvedValue({
      session: {
        ...session,
        messages: [
          ...session.messages,
          {role: 'user', content: 'add vanilla'},
          {role: 'assistant', content: 'Add vanilla extract'},
        ],
      },
      reply: 'Add vanilla extract',
    });
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await screen.findByRole('button', {name: 'Approve plan'});
    // Another tab has since started a newer session under the same key;
    // the stored id now points at that session and must stay pointing
    // there — ids are written at session start, not on every update.
    localStorage.setItem('eciperay:create-ai-session-id', 'session-2');
    await user.type(
      screen.getByPlaceholderText('Ask for changes to the plan…'),
      'add vanilla',
    );
    await user.click(screen.getByRole('button', {name: 'Refine plan'}));
    expect(await screen.findByText('Add vanilla extract')).toBeInTheDocument();
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-2',
    );
  });

  test('cancelling an older session does not clear a newer stored id', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockCancel.mockResolvedValue({session: {...session, phase: 'cancelled'}});
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await screen.findByRole('button', {name: 'Approve plan'});
    // Another tab has since started a newer session under the same key.
    localStorage.setItem('eciperay:create-ai-session-id', 'session-2');
    await user.click(screen.getByText('Cancel session'));
    expect(mockCancel).toHaveBeenCalledWith('session-1');
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBe(
      'session-2',
    );
  });

  test('shows error when start fails', async () => {
    mockStart.mockRejectedValue(new Error('Planning failed'));
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    expect(await screen.findByText('Planning failed')).toBeInTheDocument();
  });

  test('cancels from empty state', async () => {
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('refines plan and cancels active session', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockSendMessage.mockResolvedValue({
      session: {
        ...session,
        messages: [
          ...session.messages,
          {role: 'user', content: 'add vanilla'},
          {role: 'assistant', content: 'Add vanilla extract'},
        ],
      },
      reply: 'Add vanilla extract',
    });
    mockCancel.mockResolvedValue({session: {...session, phase: 'cancelled'}});
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    await user.type(
      screen.getByPlaceholderText('Ask for changes to the plan…'),
      'add vanilla',
    );
    await user.click(screen.getByRole('button', {name: 'Refine plan'}));
    expect(await screen.findByText('Add vanilla extract')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel session'));
    expect(mockCancel).toHaveBeenCalledWith('session-1');
    expect(mockNavigate).toHaveBeenCalledWith(-1);
    expect(localStorage.getItem('eciperay:create-ai-session-id')).toBeNull();
  });

  test('shows default phase label for completed session', async () => {
    mockStart.mockResolvedValue({
      session: {...session, phase: 'completed'},
      plan: '',
    });
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Start planning'}));
    expect(screen.queryByText('Cancel session')).not.toBeInTheDocument();
  });
});
