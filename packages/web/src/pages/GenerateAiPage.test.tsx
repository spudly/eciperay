import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {GenerateAiPage} from './GenerateAiPage.js';

const {mockImportAi, mockTrack} = vi.hoisted(() => ({
  mockImportAi: vi.fn(),
  mockTrack: vi.fn(),
}));

vi.mock('../lib/api.js', () => ({
  eciperay: {import: {importAi: mockImportAi}},
}));

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAnalytics: () => ({track: mockTrack, platform: 'web'})};
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

describe('GenerateAiPage', () => {
  beforeEach(() => {
    mockImportAi.mockReset();
    mockTrack.mockReset();
    mockNavigate.mockReset();
  });

  test('generates a recipe and navigates to review', async () => {
    mockImportAi.mockResolvedValue({id: 'recipe-ai-1'});
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Generate recipe'}));
    await waitFor(() => {
      expect(mockImportAi).toHaveBeenCalledWith(
        'simple chocolate chip cookies for 12',
      );
    });
    expect(mockTrack).toHaveBeenCalledWith('recipe_imported', {
      recipe_id: 'recipe-ai-1',
      source: 'ai',
    });
    expect(mockNavigate).toHaveBeenCalledWith('/import/review/recipe-ai-1');
  });

  test('shows error on failure', async () => {
    mockImportAi.mockRejectedValue(new Error('Generation failed'));
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Generate recipe'}));
    expect(await screen.findByText('Generation failed')).toBeInTheDocument();
  });

  test('shows generic error on non-Error failure', async () => {
    mockImportAi.mockRejectedValue('nope');
    const user = userEvent.setup();
    await renderWithProviders(<GenerateAiPage />);
    await user.type(
      screen.getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await user.click(screen.getByRole('button', {name: 'Generate recipe'}));
    expect(
      await screen.findByText('Recipe generation failed'),
    ).toBeInTheDocument();
  });
});
