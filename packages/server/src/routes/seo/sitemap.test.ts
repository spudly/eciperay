import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';

import {
  clearSitemapCache,
  serveSitemap,
  SITEMAP_CACHE_TTL_MS,
} from './sitemap.js';

const mockQuery = createMockQuery();

const makeResponse = () => {
  const calls = {
    type: [] as string[],
    send: [] as string[],
    set: [] as [string, string][],
  };
  const res = {
    type(value: string) {
      calls.type.push(value);
      return res;
    },
    set(field: string, value: string) {
      calls.set.push([field, value]);
      return res;
    },
    send(body: string) {
      calls.send.push(body);
    },
  };
  return {res: res as unknown as Response, calls};
};

describe('serveSitemap', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    clearSitemapCache();
  });

  test('builds XML from public recipe rows', async () => {
    mockQuery.mockResolvedValue(
      makeQueryResult([
        {
          id: 'recipe-public-2',
          slug: 'date-soup',
          updated_at: new Date('2024-03-04T08:15:00.000Z'),
        },
      ]),
    );
    const {res, calls} = makeResponse();

    await serveSitemap(res, mockQuery);

    expect(mockQuery).toHaveBeenCalledWith(LIST_PUBLIC_RECIPES_SITEMAP_SQL, []);
    expect(calls.type).toEqual(['application/xml']);
    expect(calls.send[0]).toContain('<lastmod>2024-03-04</lastmod>');
    expect(calls.send[0]).toContain(
      'https://www.eciperay.com/recipe/recipe-public-2/date-soup',
    );
  });

  test('includes the static public pages alongside recipes', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const {res, calls} = makeResponse();

    await serveSitemap(res, mockQuery);

    expect(calls.send[0]).toContain('<loc>https://www.eciperay.com/</loc>');
    expect(calls.send[0]).toContain(
      '<loc>https://www.eciperay.com/discover</loc>',
    );
    expect(calls.send[0]).toContain(
      '<loc>https://www.eciperay.com/privacy</loc>',
    );
    expect(calls.send[0]).toContain(
      '<loc>https://www.eciperay.com/terms</loc>',
    );
  });

  test('deduplicates concurrent refreshes into one query', async () => {
    let releaseQuery: (() => void) | undefined;
    const gate = new Promise<void>(resolve => {
      releaseQuery = resolve;
    });
    mockQuery.mockImplementation(async () => {
      await gate;
      return makeQueryResult([]);
    });
    const first = makeResponse();
    const second = makeResponse();

    const firstServe = serveSitemap(first.res, mockQuery);
    const secondServe = serveSitemap(second.res, mockQuery);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    if (!releaseQuery) {
      throw new Error('expected the sitemap query to be in flight');
    }
    releaseQuery();
    await Promise.all([firstServe, secondServe]);

    expect(first.calls.send[0]).toBe(second.calls.send[0]);
  });

  test('does not set headers or send a body when the query fails', async () => {
    mockQuery.mockRejectedValue(new Error('db down'));
    const {res, calls} = makeResponse();

    await expect(serveSitemap(res, mockQuery)).rejects.toThrow('db down');

    expect(calls.type).toEqual([]);
    expect(calls.set).toEqual([]);
    expect(calls.send).toEqual([]);
  });

  test('serves the cached sitemap within the TTL and refreshes after it', async () => {
    mockQuery.mockResolvedValue(makeQueryResult([]));
    const first = makeResponse();
    const start = 1_000_000;

    await serveSitemap(first.res, mockQuery, start);
    const second = makeResponse();
    await serveSitemap(second.res, mockQuery, start + SITEMAP_CACHE_TTL_MS - 1);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(second.calls.send[0]).toBe(first.calls.send[0]);
    expect(second.calls.set).toContainEqual([
      'Cache-Control',
      `public, max-age=${Math.floor(SITEMAP_CACHE_TTL_MS / 1000)}`,
    ]);

    const third = makeResponse();
    await serveSitemap(third.res, mockQuery, start + SITEMAP_CACHE_TTL_MS);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
