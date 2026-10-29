import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {eciperay} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {ImportTextPage} from './ImportTextPage.js';

const getEditor = () => screen.getByPlaceholderText('Paste your recipe here…');

describe('ImportTextPage', () => {
  test('imports from pasted text', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/text"
          element={<ImportTextPage />}
        />
        <Route
          path="/import/review/:recipeId"
          element={<div>Review</div>}
        />
      </Routes>,
      {route: '/add/text'},
    );
    await userEvent.type(getEditor(), 'Pasta\n\nBoil water.');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('shows error on failure', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/import/text', () =>
        HttpResponse.json({error: 'bad'}, {status: 500}),
      ),
    );
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    await userEvent.type(getEditor(), 'Some recipe');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('bad')).toBeInTheDocument();
    });
  });

  test('warns on a duplicate, then imports anyway on resubmit (#296)', async () => {
    server.use(
      http.post(
        'http://localhost:8080/api/recipes/import/text',
        async ({request}) => {
          const body = (await request.json()) as {allowDuplicate?: boolean};
          if (!body.allowDuplicate) {
            return HttpResponse.json(
              {
                error: 'duplicate_recipe',
                message:
                  'This recipe already exists in your library as "Pasta". Import anyway to create a second copy.',
                duplicate: {recipeId: 'recipe-uuid-9', title: 'Pasta'},
              },
              {status: 409},
            );
          }
          return HttpResponse.json(
            {id: 'recipe-uuid-10', title: 'Pasta'},
            {status: 201},
          );
        },
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/text"
          element={<ImportTextPage />}
        />
        <Route
          path="/import/review/:recipeId"
          element={<div>Review</div>}
        />
      </Routes>,
      {route: '/add/text'},
    );
    await userEvent.type(getEditor(), 'Pasta\n\nBoil water.');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(
        screen.getByText(/already exists in your library/),
      ).toBeInTheDocument();
    });
    // Submitting the same text again imports anyway.
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('does not import when the text is empty', async () => {
    const importText = vi.spyOn(eciperay.import, 'importText');
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    expect(screen.getByRole('button', {name: 'Import'})).toBeDisabled();
    expect(importText).not.toHaveBeenCalled();
  });

  test('shows generic error for non-Error throws', async () => {
    vi.spyOn(eciperay.import, 'importText').mockRejectedValueOnce('nope');
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    await userEvent.type(getEditor(), 'Some recipe');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });
});
