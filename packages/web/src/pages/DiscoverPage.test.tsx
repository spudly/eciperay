import {DISCOVER_EMPTY_MESSAGE, RECIPE_LIST_PAGE_SIZE} from '@eciperay/client';
import type {PublicRecipeDiscoveryItem} from '@eciperay/types';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {DiscoverPage} from './DiscoverPage.js';

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

  test('loads more recipes when the sentinel is visible', async () => {
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

    const observe = vi.fn();
    const disconnect = vi.fn();
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = vi.fn(callback => {
      observe.mockImplementation(() => {
        callback([{isIntersecting: true}] as IntersectionObserverEntry[], {});
      });
      return {
        observe,
        disconnect,
        unobserve: vi.fn(),
        takeRecords: vi.fn(),
        root: null,
        rootMargin: '',
        scrollMargin: '',
        thresholds: [],
      };
    });

    await renderWithProviders(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText('Public 0')).toBeInTheDocument();
    });
    observe();
    await waitFor(() => {
      expect(screen.getByText('Extra Public')).toBeInTheDocument();
    });
    expect(callCount).toBeGreaterThanOrEqual(2);

    globalThis.IntersectionObserver = originalIntersectionObserver;
  });
});
