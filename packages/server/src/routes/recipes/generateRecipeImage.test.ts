import {jest} from '@jest/globals';
import request from 'supertest';

import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';
import {nockSupabaseGetUser} from '../../test/mockNockSupabase.js';

const mockGenerateImage =
  jest.fn<() => Promise<{imageBase64: string; contentType: string}>>();

jest.unstable_mockModule('../../lib/generateRecipeImageWithOpenAi.js', () => ({
  generateRecipeImageWithOpenAi: mockGenerateImage,
}));

const {createApp} = await import('../../server.js');
const app = createApp();

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
    const res = await request(app)
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
    const res = await request(app)
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: ''});
    expect(res.status).toBe(400);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/recipes/ai/generate-image')
      .send({title: 'Pasta'});
    expect(res.status).toBe(401);
  });

  test('returns 502 when generation fails', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce(new Error('OpenAI unavailable'));
    const res = await request(app)
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('OpenAI unavailable');
  });

  test('returns 502 for non-error failures', async () => {
    nockSupabaseGetUser('user-uuid-1');
    nockAnthropicMessage('Prompt');
    mockGenerateImage.mockRejectedValueOnce('broken');
    const res = await request(app)
      .post('/api/recipes/ai/generate-image')
      .set('Authorization', 'Bearer valid-token')
      .send({title: 'Pasta'});
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Image generation failed');
  });
});
