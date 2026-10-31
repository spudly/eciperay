import {RECIPE_LIST_PAGE_SIZE} from '@eciperay/client';
import {act, screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {SharedWithMePage} from './SharedWithMePage.js';

// The host renders the design system's consolidated RecipesPage in
// its shared configuration (B7 cluster 5): link-only rows — no
// log-cook control — whose href is the recipe's public permalink,
// and this screen's own empty-state copy, which the page takes as
// a title plus a body.
describe('SharedWithMePage', () => {
  test('lists shared recipes and links their rows to their public pages', async () => {
    await renderWithProviders(<SharedWithMePage />);
    await waitFor(() => {
      expect(screen.getByText('Shared Pasta')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', {name: /^Shared Pasta, /})).toHaveAttribute(
      'href',
      '/recipe/shared-recipe-1/shared-pasta',
    );
  });

  test('shows empty state when no shared recipes', async () => {
    server.use(
      http.get('http://localhost:8080/api/recipes/shared-with-me', () =>
        HttpResponse.json([]),
      ),
    );
    await renderWithProviders(<SharedWithMePage />);
    await waitFor(() => {
      expect(
        screen.getByText('Recipes others share with you will appear here.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Open a share link while signed in to save recipes to this list.',
        ),
      ).toBeInTheDocument();
    });
  });

  // Pagination is the DS page's end-reached signal now (its
  // FlatList fires onLoadMore when scrolled to the end); jsdom has
  // no layout, so the signal cannot be driven here. What this host
  // owns, and what is pinned here, is that the first page renders
  // and no further page is fetched until that signal arrives.
  test('renders the first page without fetching the next one unprompted', async () => {
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({
        id: `shared-${index}`,
        slug: `shared-${index}`,
        title: `Shared ${index}`,
        userId: 'other-user',
      }),
    );
    let callCount = 0;
    server.use(
      http.get(
        'http://localhost:8080/api/recipes/shared-with-me',
        ({request}) => {
          const offset = Number(
            new URL(request.url).searchParams.get('offset') ?? 0,
          );
          callCount += 1;
          if (offset === 0) {
            return HttpResponse.json(firstPage);
          }
          return HttpResponse.json([]);
        },
      ),
    );
    await renderWithProviders(<SharedWithMePage />);
    await waitFor(() => {
      expect(screen.getByText('Shared 0')).toBeInTheDocument();
    });
    // Let any unprompted fetch settle out, then check none happened.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    expect(callCount).toBe(1);
  });
});
