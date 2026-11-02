import {DISCOVER_EMPTY_MESSAGE, RECIPE_LIST_PAGE_SIZE} from '@eciperay/client';
import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';

import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {DiscoverPage} from './DiscoverPage.js';

// The host renders the design system's DiscoverPage inside the DS
// PublicPageFrame (B7 cluster 11); these tests drive that page's
// real DOM: cards are anchors named for the recipe, and the filters
// sit behind the page's collapsed chooser until added.

const makeDiscoveryItem = (
  overrides: Partial<PublicRecipeDiscoveryItem> = {},
): PublicRecipeDiscoveryItem => ({
  id: 'public-recipe-1',
  slug: 'shared-pasta',
  title: 'Shared Pasta',
  description: 'A public recipe',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 25,
  imageUrl: null,
  visibility: 'public',
  authorDisplayName: 'Chef Alex',
  updatedAt: '2024-01-01T00:00:00.000Z',
  tags: [],
  communityRating: null,
  satietyScore: null,
  nutritionStatus: null,
  calories: null,
  proteinG: null,
  ...overrides,
});

describe('DiscoverPage', () => {
  test('lists public recipes linking to public pages', async () => {
    await renderWithProviders(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText('Shared Pasta')).toBeInTheDocument();
    });
    const link = screen.getByRole('link', {name: /Shared Pasta/i});
    expect(link).toHaveAttribute(
      'href',
      '/recipe/public-recipe-1/shared-pasta',
    );
    expect(screen.getByText(/By Chef Alex/)).toBeInTheDocument();
  });

  test('shows empty state when no public recipes match', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/recipes', () =>
        HttpResponse.json([]),
      ),
    );
    await renderWithProviders(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText(DISCOVER_EMPTY_MESSAGE)).toBeInTheDocument();
    });
  });

  test('filters recipes by search query', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/recipes', ({request}) => {
        const search = new URL(request.url).searchParams.get('search');
        if (search === 'curry') {
          return HttpResponse.json([
            makeDiscoveryItem({
              id: 'curry-1',
              slug: 'curry',
              title: 'Public Curry',
            }),
          ]);
        }
        return HttpResponse.json([]);
      }),
    );
    const user = userEvent.setup();
    await renderWithProviders(<DiscoverPage />);
    await user.type(
      screen.getByPlaceholderText(/Search public recipes/i),
      'curry',
    );
    await waitFor(() => {
      expect(screen.getByText('Public Curry')).toBeInTheDocument();
    });
  });

  // Pagination is the DS page's end-reached signal now (its list
  // fires onLoadMore when scrolled to the end); jsdom has no layout,
  // so the signal cannot be driven here — the browser-level flow is
  // covered by the Playwright e2e pagination case. What this host
  // owns, and what is pinned here, is that the first page renders
  // and no further page is fetched until that signal arrives.
  test('renders the first page without fetching the next one unprompted', async () => {
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeDiscoveryItem({
        id: `public-${index}`,
        slug: `public-${index}`,
        title: `Public ${index}`,
      }),
    );
    const secondPage = [
      makeDiscoveryItem({
        id: 'public-extra',
        slug: 'public-extra',
        title: 'Extra Public',
      }),
    ];
    let callCount = 0;
    server.use(
      http.get('http://localhost:8080/api/public/recipes', ({request}) => {
        const offset = Number(
          new URL(request.url).searchParams.get('offset') ?? 0,
        );
        callCount += 1;
        if (offset === 0) {
          return HttpResponse.json(firstPage);
        }
        return HttpResponse.json(secondPage);
      }),
    );

    await renderWithProviders(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText('Public 0')).toBeInTheDocument();
    });
    expect(callCount).toBe(1);
    expect(screen.queryByText('Extra Public')).not.toBeInTheDocument();
  });

  test('shows the error state when the first load fails', async () => {
    server.use(
      http.get('http://localhost:8080/api/public/recipes', () =>
        HttpResponse.json({error: 'boom'}, {status: 500}),
      ),
    );
    await renderWithProviders(<DiscoverPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load public recipes/i),
      ).toBeInTheDocument();
    });
  });
});
