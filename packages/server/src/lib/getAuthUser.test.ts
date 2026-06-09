import type {Request} from 'express';

import {extractBearerToken, getAuthUserFromRequest} from './getAuthUser.js';

describe('extractBearerToken', () => {
  test('returns the bearer token when the header is valid', () => {
    const req = {headers: {authorization: 'Bearer abc123'}} as Request;
    expect(extractBearerToken(req)).toBe('abc123');
  });

  test('returns null when the authorization header is missing', () => {
    const req = {headers: {}} as Request;
    expect(extractBearerToken(req)).toBeNull();
  });
});

describe('getAuthUserFromRequest', () => {
  test('returns null when the request has no bearer token', async () => {
    const req = {headers: {}} as Request;
    await expect(getAuthUserFromRequest(req)).resolves.toBeNull();
  });
});
