import {apiFetch} from './api';
import {supabase} from './supabase';

jest.mock('./supabase', () => ({supabase: {auth: {getSession: jest.fn()}}}));

const mockGetSession = supabase.auth.getSession as jest.Mock;

const mockFetch = jest.fn();
(globalThis as unknown as {fetch: typeof jest.fn}).fetch = mockFetch;

describe('apiFetch', () => {
  test('attaches Authorization header when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: {session: {access_token: 'test-token'}},
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({result: 'ok'}),
    });

    await apiFetch('/recipes');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/recipes'),
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: 'Bearer test-token'}),
      }),
    );
  });

  test('omits Authorization header when no session', async () => {
    mockGetSession.mockResolvedValue({data: {session: null}});
    mockFetch.mockResolvedValue({ok: true, json: () => Promise.resolve({})});

    await apiFetch('/recipes');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
  });

  test('throws on non-ok response', async () => {
    mockGetSession.mockResolvedValue({data: {session: null}});
    mockFetch.mockResolvedValue({ok: false, status: 404});

    await expect(apiFetch('/missing')).rejects.toThrow('API error 404');
  });

  test('returns parsed JSON on success', async () => {
    mockGetSession.mockResolvedValue({data: {session: null}});
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{id: '1', title: 'Pasta'}]),
    });

    const result = await apiFetch<{id: string}[]>('/recipes');
    expect(result).toHaveLength(1);
  });
});
