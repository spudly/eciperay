import {createApiClient, type ApiError} from './createApiClient.js';
import {isDuplicateRecipeError} from './importApi.js';

describe('createApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('sends Authorization header when token is present', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ok: true}),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => 'token-abc',
    });
    await client.fetch('/recipes');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/recipes',
      expect.objectContaining({
        headers: expect.objectContaining({Authorization: 'Bearer token-abc'}),
      }),
    );
  });

  test('throws default message when error body is not JSON', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await expect(client.fetch('/broken')).rejects.toThrow(
      'API error 500: /broken',
    );
  });

  test('throws on non-ok response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({error: 'Not found'}),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await expect(client.fetch('/missing')).rejects.toThrow('Not found');
  });

  test('prefers the human message over the error code in error bodies', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            error: 'plan_required',
            requiredPlan: 'power',
            plan: 'free',
            message:
              "This feature requires the Power plan. You're on the Free plan.",
          }),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await expect(
      client.fetch('/account/personal-access-tokens'),
    ).rejects.toThrow(
      "This feature requires the Power plan. You're on the Free plan.",
    );
  });

  test('attaches the server error code to the thrown error (#296)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 409,
        text: async () =>
          JSON.stringify({
            error: 'duplicate_recipe',
            message: 'This recipe already exists in your library as "Pasta".',
            duplicate: {recipeId: 'recipe-uuid-9', title: 'Pasta'},
          }),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    const error = await client
      .fetch('/recipes/import/text')
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(Error);
    expect((error as ApiError).code).toBe('duplicate_recipe');
    expect((error as Error).message).toContain('already exists');
    expect(isDuplicateRecipeError(error)).toBe(true);
    expect(isDuplicateRecipeError(new Error('other'))).toBe(false);
    expect(isDuplicateRecipeError(null)).toBe(false);
  });

  test('attaches the HTTP status to the thrown error (#344)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({error: 'Invalid or expired token'}),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => 'expired-token',
    });
    const error = await client
      .fetch('/auth/sync', {method: 'POST'})
      .catch((error_: unknown) => error_);
    expect(error).toBeInstanceOf(Error);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).code).toBe('Invalid or expired token');
    expect((error as Error).message).toBe('Invalid or expired token');
  });

  test('returns undefined for 204 responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ok: true, status: 204});
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await expect(
      client.fetch('/recipes/1', {method: 'DELETE'}),
    ).resolves.toBeUndefined();
  });

  test('omits Authorization when token is null and merges custom headers', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ok: true, status: 200, json: async () => ({})});
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await client.fetch('/recipes', {headers: {'X-Custom': '1'}});
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/recipes',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom': '1',
        }),
      }),
    );
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  test('merges Headers instance custom headers', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ok: true, status: 200, json: async () => ({})});
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => 'token-abc',
    });
    const customHeaders = new Headers({'X-Custom': '2'});
    await client.fetch('/recipes', {headers: customHeaders});
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/recipes',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer token-abc',
          'x-custom': '2',
        }),
      }),
    );
  });

  test('merges array custom headers', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ok: true, status: 200, json: async () => ({})});
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await client.fetch('/recipes', {headers: [['X-Custom', '3']]});
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/recipes',
      expect.objectContaining({
        headers: expect.objectContaining({'X-Custom': '3'}),
      }),
    );
  });
});

describe('createApiClient message-only error bodies', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('ignores a message field unaccompanied by an error code', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({message: 'AI unavailable'}),
      });
    const client = createApiClient({
      baseUrl: 'http://localhost:8080',
      getToken: async () => null,
    });
    await expect(client.fetch('/recipes/1/tweak-ai-sessions')).rejects.toThrow(
      'API error 500: /recipes/1/tweak-ai-sessions',
    );
  });
});
