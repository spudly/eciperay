import type {Response} from 'express';

import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {LIST_PUBLIC_RECIPES_SITEMAP_SQL} from '../recipes/sqlConstants.js';

import {serveSitemap} from './sitemap.js';

const mockQuery = createMockQuery();

const makeResponse = () => {
  const calls = {type: [] as string[], send: [] as string[]};
  const res = {
    type(value: string) {
      calls.type.push(value);
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
});
