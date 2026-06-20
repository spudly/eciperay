import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {GenerateAiPage} from './GenerateAiPage.js';

const {
  mockStart,
  mockApprovePlan,
  mockCreateRecipe,
  mockSendMessage,
  mockCancel,
  mockTrack,
} = vi.hoisted(() => ({
  mockStart: vi.fn(),
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
    mockStart.mockReset();
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
