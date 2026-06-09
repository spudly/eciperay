import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {recipoo} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {ImportTextPage} from './ImportTextPage.js';

const getEditor = () => screen.getByRole('textbox', {name: 'Recipe text'});

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
    await userEvent.click(getEditor());
    await userEvent.type(getEditor(), 'Pasta\n\nBoil water.');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('renders pasted HTML as rich text', async () => {
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    const editor = getEditor();
    editor.innerHTML = '<h1>Pasta</h1><p>Boil water.</p>';
    fireEvent.input(editor);
    expect(editor.querySelector('h1')).toHaveTextContent('Pasta');
    expect(editor).toHaveTextContent('Boil water.');
    expect(screen.getByText('Import')).not.toBeDisabled();
  });

  test('shows error on failure', async () => {
    server.use(
      http.post('http://localhost:8080/recipes/import/text', () =>
        HttpResponse.json({error: 'bad'}, {status: 500}),
      ),
    );
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    await userEvent.click(getEditor());
    await userEvent.type(getEditor(), 'Some recipe');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('bad')).toBeInTheDocument();
    });
  });

  test('shows generic error for non-Error throws', async () => {
    vi.spyOn(recipoo.import, 'importText').mockRejectedValueOnce('nope');
    await renderWithProviders(<ImportTextPage />, {route: '/add/text'});
    await userEvent.click(getEditor());
    await userEvent.type(getEditor(), 'Some recipe');
    await userEvent.click(screen.getByText('Import'));
    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });
});
