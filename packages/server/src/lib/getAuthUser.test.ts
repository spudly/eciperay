import {jest} from '@jest/globals';
import type {Request} from 'express';
import type {User} from '@supabase/supabase-js';

type GetUserResult = {
  data: {user: User | null};
  error: {message: string; status?: number; name?: string} | null;
};

const mockGetUser = jest.fn<() => Promise<GetUserResult>>();

jest.unstable_mockModule('../supabase.js', () => ({
  supabase: {auth: {getUser: mockGetUser}},
}));

const {extractBearerToken, getAuthUserFromRequest, lookupAuthUserFromRequest} =
  await import('./getAuthUser.js');

const user = {id: 'user-1', email: 'test@example.com'} as unknown as User;

const authedReq = {headers: {authorization: 'Bearer token-123'}} as Request;

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
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('returns the user when Supabase accepts the token', async () => {
    mockGetUser.mockResolvedValue({data: {user}, error: null});
    await expect(getAuthUserFromRequest(authedReq)).resolves.toBe(user);
  });

  test('returns null when Supabase rejects the token', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'Invalid token', status: 401},
    });
    await expect(getAuthUserFromRequest(authedReq)).resolves.toBeNull();
  });

  test('returns null when the Supabase lookup fails transiently', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'Internal error', status: 500},
    });
    await expect(getAuthUserFromRequest(authedReq)).resolves.toBeNull();
  });
});

describe('lookupAuthUserFromRequest', () => {
  test('reports invalid when the request has no bearer token', async () => {
    const req = {headers: {}} as Request;
    await expect(lookupAuthUserFromRequest(req)).resolves.toEqual({
      status: 'invalid',
    });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('reports authenticated with the user when Supabase accepts the token', async () => {
    mockGetUser.mockResolvedValue({data: {user}, error: null});
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'authenticated',
      user,
    });
  });

  test('reports invalid when Supabase rejects the token with 401', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'Invalid token', status: 401},
    });
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'invalid',
    });
  });

  test('reports invalid when Supabase reports the session is gone (session_not_found)', async () => {
    // auth-js converts a `session_not_found` response into an
    // AuthSessionMissingError with status 400 — the name, not the status,
    // marks it as a credential rejection.
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {
        message: 'Auth session missing!',
        name: 'AuthSessionMissingError',
        status: 400,
      },
    });
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'invalid',
    });
  });

  test('reports invalid when Supabase rejects the token with 403', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'Forbidden', status: 403},
    });
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'invalid',
    });
  });

  test('reports unavailable when Supabase fails with a 5xx', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'Internal error', status: 500},
    });
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('reports unavailable when the lookup error carries no status (network failure)', async () => {
    mockGetUser.mockResolvedValue({
      data: {user: null},
      error: {message: 'fetch failed'},
    });
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('reports unavailable when Supabase returns no user and no error', async () => {
    mockGetUser.mockResolvedValue({data: {user: null}, error: null});
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  test('reports unavailable when the getUser call itself throws', async () => {
    mockGetUser.mockRejectedValue(new Error('network unreachable'));
    await expect(lookupAuthUserFromRequest(authedReq)).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
