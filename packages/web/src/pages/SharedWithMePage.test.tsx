import {
  RECIPE_LIST_PAGE_SIZE,
  SHARED_WITH_ME_EMPTY_MESSAGE,
} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {SharedWithMePage} from './SharedWithMePage.js';

describe('SharedWithMePage', () => {
  test('lists shared recipes linking to public pages', async () => {
    await renderWithProviders(<SharedWithMePage />);
    await waitFor(() => {
      expect(screen.getByText('Shared Pasta')).toBeInTheDocument();
    });
    const link = screen.getByRole('link', {name: /Shared Pasta/i});
    expect(link).toHaveAttribute(
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
        screen.getByText(SHARED_WITH_ME_EMPTY_MESSAGE),
      ).toBeInTheDocument();
    });
  });

  test('loads more recipes when the sentinel is visible', async () => {
    const firstPage = Array.from({length: RECIPE_LIST_PAGE_SIZE}, (_, index) =>
      makeRecipeDetail({
        id: `shared-${index}`,
        slug: `shared-${index}`,
        title: `Shared ${index}`,
        userId: 'other-user',
      }),
    );
    const secondPage = [
      makeRecipeDetail({
        id: 'shared-extra',
        slug: 'shared-extra',
        title: 'Extra Shared',
        userId: 'other-user',
      }),
    ];
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
          return HttpResponse.json(secondPage);
        },
      ),
    );

    const observe = vi.fn();
    const disconnect = vi.fn();
    const originalIntersectionObserver = globalThis.IntersectionObserver;
    // eslint-disable-next-line prefer-arrow-callback -- vitest 5 requires a constructible (non-arrow) implementation for mocks used with `new`
    globalThis.IntersectionObserver = vi.fn(function (callback) {
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

    await renderWithProviders(<SharedWithMePage />);
    await waitFor(() => {
      expect(screen.getByText('Shared 0')).toBeInTheDocument();
    });
    observe();
    await waitFor(() => {
      expect(screen.getByText('Extra Shared')).toBeInTheDocument();
    });
    expect(callCount).toBeGreaterThanOrEqual(2);

    globalThis.IntersectionObserver = originalIntersectionObserver;
  });
});
