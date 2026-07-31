import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';

import {renderWithProviders} from '../../test/testUtils.js';
import {server} from '../../test/msw/server.js';

import {RecipeCommentsSection} from './RecipeCommentsSection.js';

const API = 'http://localhost:8080';

const sampleComment = {
  id: 'comment-1',
  recipeId: 'recipe-uuid-1',
  authorUserId: 'user-1',
  authorDisplayName: 'Alex',
  body: 'Delicious!',
  contentRevision: 1,
  isStale: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

describe('RecipeCommentsSection', () => {
  test('lists comments with stale badges', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );

    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );

    expect(await screen.findByText('Delicious!')).toBeInTheDocument();
    expect(screen.getByLabelText(/earlier version/i)).toBeInTheDocument();
  });

  test('renders loading and empty states', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () => new Promise(() => {})),
    );
    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );
    expect(screen.getByRole('status', {name: 'Loading'})).toBeInTheDocument();

    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () => HttpResponse.json([])),
    );
    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-2"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );
    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
  });

  test('posts a new comment', async () => {
    const posted: string[] = [];
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () => HttpResponse.json([])),
      http.post(`${API}/api/recipes/:id/comments`, async ({request}) => {
        const body = (await request.json()) as {body: string};
        posted.push(body.body);
        return HttpResponse.json(
          {...sampleComment, body: body.body},
          {status: 201},
        );
      }),
    );

    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );

    await userEvent.type(screen.getByPlaceholderText('Add a comment'), 'Nice!');
    await userEvent.click(screen.getByText('Post comment'));
    await waitFor(() => {
      expect(posted).toEqual(['Nice!']);
    });
  });

  test('edits and deletes comments', async () => {
    let updated = false;
    let deleted = false;
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
      http.put(`${API}/api/recipes/:id/comments/:commentId`, async () => {
        updated = true;
        return HttpResponse.json({...sampleComment, body: 'Updated'});
      }),
      http.delete(`${API}/api/recipes/:id/comments/:commentId`, () => {
        deleted = true;
        return new HttpResponse(null, {status: 204});
      }),
    );

    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );

    await screen.findByText('Delicious!');
    await userEvent.click(screen.getByText('Edit'));
    const editArea = screen.getByDisplayValue('Delicious!');
    await userEvent.clear(editArea);
    await userEvent.type(editArea, 'Updated');
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(updated).toBe(true);
    });
    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(deleted).toBe(true);
    });
  });

  test('cancels comment edits', async () => {
    server.use(
      http.get(`${API}/api/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );

    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        ownerUserId="owner-uuid"
      />,
      {withAuth: true},
    );

    await screen.findByText('Delicious!');
    await userEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Delicious!')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Delicious!')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Delicious!')).not.toBeInTheDocument();
  });

  test('loads public comments with share token', async () => {
    server.use(
      http.get(`${API}/api/public/recipes/:id/comments`, () =>
        HttpResponse.json([sampleComment]),
      ),
    );

    await renderWithProviders(
      <RecipeCommentsSection
        recipeId="recipe-uuid-1"
        shareToken="tok"
        publicList
      />,
      {withAuth: false},
    );

    expect(await screen.findByText('Delicious!')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to join the conversation'),
    ).toBeInTheDocument();
  });
});
