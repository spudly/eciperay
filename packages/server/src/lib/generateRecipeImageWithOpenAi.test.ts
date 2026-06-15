import {jest} from '@jest/globals';

import {generateRecipeImageWithOpenAi} from './generateRecipeImageWithOpenAi.js';

type MockFetchResponse = Partial<Response> & {json?: () => Promise<unknown>};

type MockFetchOptions =
  | MockFetchResponse
  | {dalleImageResponse: MockFetchResponse};

const isDalleFetchOptions = (
  options: MockFetchOptions,
): options is {dalleImageResponse: MockFetchResponse} =>
  'dalleImageResponse' in options;

const mockFetch = (options: MockFetchOptions = {}) => {
  if (isDalleFetchOptions(options)) {
    return jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
        json: async () => ({
          data: [{url: 'https://example.com/generated.png'}],
        }),
      } as Response)
      .mockResolvedValueOnce(options.dalleImageResponse as Response);
  }

  return jest
    .fn<typeof fetch>()
    .mockResolvedValue({
      ok: true,
      text: async () => '',
      json: async () => ({
        data: [{b64_json: 'aGVsbG8='}],
        output_format: 'png',
      }),
      ...options,
    } as Response);
};

const parseRequestBody = (body: string | null | undefined) => {
  if (typeof body !== 'string') {
    throw new TypeError('Expected string request body');
  }
  return JSON.parse(body) as unknown;
};

describe('generateRecipeImageWithOpenAi', () => {
  const originalKey = process.env['OPENAI_API_KEY'];
  const originalModel = process.env['OPENAI_IMAGE_MODEL'];

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env['OPENAI_API_KEY'];
    } else {
      process.env['OPENAI_API_KEY'] = originalKey;
    }
    if (originalModel === undefined) {
      delete process.env['OPENAI_IMAGE_MODEL'];
    } else {
      process.env['OPENAI_IMAGE_MODEL'] = originalModel;
    }
  });

  test('returns base64 image data from GPT image models', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    delete process.env['OPENAI_IMAGE_MODEL'];
    const fetchFn = mockFetch({});
    const result = await generateRecipeImageWithOpenAi(
      'Pasta on a plate',
      fetchFn,
    );
    expect(result).toEqual({imageBase64: 'aGVsbG8=', contentType: 'image/png'});
    const [, request] = fetchFn.mock.calls[0] ?? [];
    expect(parseRequestBody(request?.body as string | undefined)).toEqual({
      model: 'gpt-image-1-mini',
      prompt: 'Pasta on a plate',
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
    });
  });

  test('supports legacy dall-e models with response_format', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['OPENAI_IMAGE_MODEL'] = 'dall-e-3';
    const fetchFn = mockFetch({});
    await generateRecipeImageWithOpenAi('Pasta on a plate', fetchFn);
    const [, request] = fetchFn.mock.calls[0] ?? [];
    expect(parseRequestBody(request?.body as string | undefined)).toEqual({
      model: 'dall-e-3',
      prompt: 'Pasta on a plate',
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });
  });

  test('defaults content type when a dall-e image URL omits headers', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['OPENAI_IMAGE_MODEL'] = 'dall-e-3';
    const fetchFn = mockFetch({
      dalleImageResponse: {
        ok: true,
        headers: new Headers(),
        arrayBuffer: async () => Uint8Array.from([1]).buffer,
      },
    });
    const result = await generateRecipeImageWithOpenAi('Pasta', fetchFn);
    expect(result.contentType).toBe('image/png');
  });

  test('downloads image URLs for dall-e responses', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['OPENAI_IMAGE_MODEL'] = 'dall-e-3';
    const fetchFn = mockFetch({
      dalleImageResponse: {
        ok: true,
        headers: new Headers({'content-type': 'image/png'}),
        arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      },
    });
    const result = await generateRecipeImageWithOpenAi('Pasta', fetchFn);
    expect(result).toEqual({imageBase64: 'AQID', contentType: 'image/png'});
  });

  test('throws when OPENAI_API_KEY is missing', async () => {
    delete process.env['OPENAI_API_KEY'];
    await expect(
      generateRecipeImageWithOpenAi('Pasta', mockFetch({})),
    ).rejects.toThrow('OPENAI_API_KEY is not configured');
  });

  test('throws when OpenAI returns an error response', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const fetchFn = mockFetch({ok: false, text: async () => 'rate limited'});
    await expect(
      generateRecipeImageWithOpenAi('Pasta', fetchFn),
    ).rejects.toThrow('Image generation failed: rate limited');
  });

  test('throws when OpenAI returns no image data', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const fetchFn = mockFetch({json: async () => ({data: [{}]})});
    await expect(
      generateRecipeImageWithOpenAi('Pasta', fetchFn),
    ).rejects.toThrow('Image generation returned no image');
  });

  test('throws when a dall-e image URL cannot be downloaded', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['OPENAI_IMAGE_MODEL'] = 'dall-e-3';
    const fetchFn = mockFetch({dalleImageResponse: {ok: false}});
    await expect(
      generateRecipeImageWithOpenAi('Pasta', fetchFn),
    ).rejects.toThrow('Image generation returned an unreadable image URL');
  });

  test('throws when a downloaded dall-e image is empty', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    process.env['OPENAI_IMAGE_MODEL'] = 'dall-e-3';
    const fetchFn = mockFetch({
      dalleImageResponse: {
        ok: true,
        headers: new Headers({'content-type': 'image/jpeg'}),
        arrayBuffer: async () => new ArrayBuffer(0),
      },
    });
    await expect(
      generateRecipeImageWithOpenAi('Pasta', fetchFn),
    ).rejects.toThrow('Image generation returned an empty image');
  });

  test('maps jpeg and webp output formats', async () => {
    process.env['OPENAI_API_KEY'] = 'test-key';
    const fetchFn = mockFetch({
      json: async () => ({
        data: [{b64_json: 'aGVsbG8='}],
        output_format: 'jpeg',
      }),
    });
    const jpeg = await generateRecipeImageWithOpenAi('Pasta', fetchFn);
    expect(jpeg.contentType).toBe('image/jpeg');

    fetchFn.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
      json: async () => ({
        data: [{b64_json: 'aGVsbG8='}],
        output_format: 'webp',
      }),
    } as Response);
    const webp = await generateRecipeImageWithOpenAi('Pasta', fetchFn);
    expect(webp.contentType).toBe('image/webp');
  });
});
