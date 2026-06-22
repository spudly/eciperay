import type {Request} from 'express';

import {getShareTokenFromQuery} from './getShareTokenFromQuery.js';

const makeReq = (query: Request['query']): Request => ({query}) as Request;

describe('getShareTokenFromQuery', () => {
  test('returns string token from t query param', () => {
    expect(getShareTokenFromQuery(makeReq({t: 'abc123'}))).toBe('abc123');
  });

  test('returns first token when t is an array', () => {
    expect(getShareTokenFromQuery(makeReq({t: ['first', 'second']}))).toBe(
      'first',
    );
  });

  test('returns undefined for missing or empty token', () => {
    expect(getShareTokenFromQuery(makeReq({}))).toBeUndefined();
    expect(getShareTokenFromQuery(makeReq({t: ''}))).toBeUndefined();
    expect(getShareTokenFromQuery(makeReq({t: []}))).toBeUndefined();
  });
});
