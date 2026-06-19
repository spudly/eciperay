import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {server} from '../test/msw/server.js';
import {eciperay} from '../lib/api.js';
import {renderWithProviders} from '../test/testUtils.js';

import {TweakAiPage} from './TweakAiPage.js';

const renderTweakAi = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/recipes/:recipeId/tweak-ai"
        element={<TweakAiPage />}
      />
      <Route
        path="/recipes/:recipeId"
        element={<div>Recipe detail</div>}
      />
      <Route
        path="/recipes/:recipeId/versions/:versionId/edit"
        element={<div>Edit draft</div>}
      />
    </Routes>,
    {route: '/recipes/recipe-uuid-1/tweak-ai'},
  );

describe('TweakAiPage', () => {
  test('creates an AI draft and navigates to edit', async () => {
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(
        'e.g. make it vegetarian, reduce sugar, add more spice',
      ),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Create draft'));
    expect(await screen.findByText('Edit draft')).toBeInTheDocument();
  });

  test('returns to recipe detail on cancel', async () => {
    await renderTweakAi();
    await userEvent.click(screen.getByText('Cancel'));
    expect(await screen.findByText('Recipe detail')).toBeInTheDocument();
  });

  test('shows an error when AI tweak fails', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/:id/versions/ai', () =>
        HttpResponse.json({message: 'AI unavailable'}, {status: 500}),
      ),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(
        'e.g. make it vegetarian, reduce sugar, add more spice',
      ),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Create draft'));
    await waitFor(() => {
      expect(
        screen.getByText('API error 500: /recipes/recipe-uuid-1/versions/ai'),
      ).toBeInTheDocument();
    });
    consoleError.mockRestore();
  });

  test('shows a generic error for non-error failures', async () => {
    const tweakWithAi = vi
      .spyOn(eciperay.versions, 'tweakWithAi')
      .mockRejectedValueOnce('nope');
    await renderTweakAi();
    await userEvent.type(
      screen.getByPlaceholderText(
        'e.g. make it vegetarian, reduce sugar, add more spice',
      ),
      'make it spicier',
    );
    await userEvent.click(screen.getByText('Create draft'));
    expect(await screen.findByText('AI tweak failed')).toBeInTheDocument();
    tweakWithAi.mockRestore();
  });
});
