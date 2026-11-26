import {api} from './api';
import {supabase} from './supabase';

jest.mock('./supabase', () => ({supabase: {auth: {getSession: jest.fn()}}}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockFetch = jest.fn();
(globalThis as unknown as {fetch: typeof jest.fn}).fetch = mockFetch;

describe('api', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: {session: {access_token: 'test-token'}},
    });
    mockFetch.mockResolvedValue({ok: true, json: () => Promise.resolve([])});
  });

  test('recipes.list calls API with auth header', async () => {
    await api.recipes.list();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/recipes'),
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: 'Bearer test-token'}),
      }),
    );
  });

  test('getToken returns null without session', async () => {
    mockGetSession.mockResolvedValue({data: {session: null}});
    await api.recipes.list();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
  });

  test('propagates a getSession error instead of sending the request without a token', async () => {
    const refreshFailure = new Error('refresh failed');
    mockGetSession.mockResolvedValue({
      data: {session: null},
      error: refreshFailure,
    });
    await expect(api.auth.syncUser()).rejects.toBe(refreshFailure);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
