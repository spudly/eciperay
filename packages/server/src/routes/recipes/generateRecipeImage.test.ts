import {jest} from '@jest/globals';
import Anthropic from '@anthropic-ai/sdk';
import request from 'supertest';

import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';
import {lazyTestApp} from '../../test/lazyTestApp.js';

const mockGenerateImage =
  jest.fn<() => Promise<{imageBase64: string; contentType: string}>>();

jest.unstable_mockModule('../../lib/generateRecipeImageWithOpenAi.js', () => ({
  generateRecipeImageWithOpenAi: mockGenerateImage,
}));

const {formatImageGenerationError} = await import('./generateRecipeImage.js');
const getApp = lazyTestApp();

describe('POST /recipes/ai/generate-image', () => {
  beforeEach(() => {
    mockGenerateImage.mockResolvedValue({
      imageBase64: 'aGVsbG8=',
      contentType: 'image/png',
    });
  });

  test('returns generated image data', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('A plated pasta dish with basil');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Pasta',
        description: 'Fresh basil pasta',
        ingredients: [
          {name: 'pasta', quantity: 200, unit: 'g'},
          {name: 'basil'},
        ],
        instructions: ['Boil pasta', 'Toss with basil'],
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      imageBase64: 'aGVsbG8=',
      contentType: 'image/png',
    });
    expect(mockGenerateImage).toHaveBeenCalledWith(
      'A plated pasta dish with basil',
    );
  });

  test('returns 400 for invalid body', async () => {
    nockSupabaseGetUser('user-uuid-1');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .send({title: 'Pasta'});
    expect(res.status).toBe(401);
  });

  test('returns 502 when generation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce(new Error('OpenAI unavailable'));
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation failed. Please try again.');
  });

  test('returns a friendly error when Anthropic connection fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockRejectedValueOnce(
      new Anthropic.APIConnectionError({message: 'Connection reset'}),
    );
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe(
      'Image generation is temporarily unavailable. Please try again.',
    );
  });

  test('returns a friendly error when Anthropic API errors', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockRejectedValueOnce(
      new Anthropic.APIError(503, undefined, 'Service unavailable', undefined),
    );
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe(
      'Image generation is temporarily unavailable. Please try again.',
    );
  });

  test('returns unavailable when OpenAI is not configured', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce(
      new Error('OPENAI_API_KEY is not configured'),
    );
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation is unavailable.');
  });

  test('returns friendly error for unexpected Claude response', async () => {
    nockSupabaseGetUser('user-uuid-1');
    anthropicCreateSpy.mockResolvedValueOnce({
      id: 'msg-test',
      type: 'message',
      role: 'assistant',
      content: [{type: 'image', source: {type: 'base64', data: 'x'}}],
      model: 'claude-haiku-4-5',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {input_tokens: 1, output_tokens: 1},
    } as never);
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation failed. Please try again.');
  });

  test('returns friendly error when OpenAI image generation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce(
      new Error('Image generation failed: rate limited'),
    );
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation failed. Please try again.');
  });

  test('returns 502 for non-error failures', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce('broken');
    const res = await request(getApp())
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation failed. Please try again.');
  });
});

describe('formatImageGenerationError', () => {
  test('maps premature close messages to a friendly unavailable error', () => {
    expect(
      formatImageGenerationError(
        new Error(
          'Invalid response body while trying to fetch https://api.anthropic.com/v1/messages: Premature close',
        ),
      ),
    ).toBe('Image generation is temporarily unavailable. Please try again.');
  });
});
