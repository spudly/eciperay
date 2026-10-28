import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';

import {makeCookLog} from '../../test/fixtures/recipe.js';
import {server} from '../../test/msw/server.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {CookHistoryTab} from './CookHistoryTab.js';

describe('CookHistoryTab', () => {
  test('renders cook log timeline', async () => {
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Turned out great')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('4 stars')).toBeInTheDocument();
    expect(screen.getByText('Log a cook')).toBeInTheDocument();
  });

  test('shows empty state when no cooks exist', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () => HttpResponse.json([]),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    expect(await screen.findByText(/No cooks logged yet/)).toBeInTheDocument();
    expect(
      screen.getByText(/Log a cook here or finish a cooking session/),
    ).toBeInTheDocument();
  });

  test('logs a cook without cooking mode', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () => HttpResponse.json([]),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await userEvent.click(await screen.findByText('Log a cook'));
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('5 stars'));
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook (optional)'),
      'Quick weeknight cook',
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Log a cook')).toBeInTheDocument();
  });

  test('dismisses the log cook form via Skip', async () => {
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await userEvent.click(await screen.findByText('Log a cook'));
    await userEvent.click(screen.getByText('Skip'));
    expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
  });

  test('deletes a cook log entry after in-page confirmation (#266)', async () => {
    let deleted = false;
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () => HttpResponse.json(deleted ? [] : [makeCookLog()]),
      ),
      http.delete(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks/:cookLogId',
        () => {
          deleted = true;
          return new HttpResponse(null, {status: 204});
        },
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await userEvent.click(await screen.findByText('Delete'));
    // Two-step in-page confirmation: nothing is deleted yet.
    expect(deleted).toBe(false);
    expect(screen.getByText('Turned out great')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Confirm delete'));
    await waitFor(() => {
      expect(screen.queryByText('Turned out great')).not.toBeInTheDocument();
    });
    expect(deleted).toBe(true);
    expect(await screen.findByText(/No cooks logged yet/)).toBeInTheDocument();
  });

  test('cancelling the delete confirmation keeps the entry (#266)', async () => {
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await userEvent.click(await screen.findByText('Delete'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
    expect(screen.getByText('Turned out great')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('surfaces an error when deleting a cook log fails (#266)', async () => {
    server.use(
      http.delete(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks/:cookLogId',
        () => HttpResponse.json({error: 'Server exploded'}, {status: 500}),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    await userEvent.click(await screen.findByText('Delete'));
    await userEvent.click(screen.getByText('Confirm delete'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not delete entry/,
    );
    // The entry stays listed on failure.
    expect(screen.getByText('Turned out great')).toBeInTheDocument();
  });

  test('renders cook logs without ratings or notes', async () => {
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/:id/versions/:versionId/cooks',
        () =>
          HttpResponse.json([
            makeCookLog({authorStarRating: null, notes: null}),
          ]),
      ),
    );
    await renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId="version-uuid-1"
      />,
    );
    expect(await screen.findByText(/2024/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/stars/)).not.toBeInTheDocument();
  });
});
