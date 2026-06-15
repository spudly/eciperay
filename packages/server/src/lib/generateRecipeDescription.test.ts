import {jest} from '@jest/globals';

import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';

import {anthropic} from './anthropic.js';
import {generateRecipeDescription} from './generateRecipeDescription.js';

describe('generateRecipeDescription', () => {
  test('returns trimmed description text from Claude', async () => {
    nockAnthropicMessage('  A cozy bowl of creamy pasta with fresh herbs.  ');
    const description = await generateRecipeDescription({
      title: 'Creamy Pasta',
      ingredients: ['pasta', 'cream'],
      instructions: ['Boil pasta', 'Stir in cream'],
      prepTimeMin: 10,
      cookTimeMin: 20,
    });
    expect(description).toBe('A cozy bowl of creamy pasta with fresh herbs.');
  });

  test('falls back when ingredients and instructions are empty', async () => {
    nockAnthropicMessage('A delicious dish worth making.');
    const description = await generateRecipeDescription({
      title: 'Mystery Dish',
      ingredients: [],
      instructions: [],
    });
    expect(description).toBe('A delicious dish worth making.');
  });

  test('throws on unexpected Claude response type', async () => {
    jest
      .spyOn(anthropic.messages, 'create')
      .mockResolvedValueOnce({
        id: 'msg-test',
        type: 'message',
        role: 'assistant',
        content: [{type: 'image', source: {type: 'base64', data: 'x'}}],
        model: 'claude-haiku-4-5',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {input_tokens: 1, output_tokens: 1},
      } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);
    await expect(
      generateRecipeDescription({
        title: 'Soup',
        ingredients: ['broth'],
        instructions: ['Simmer'],
      }),
    ).rejects.toThrow('Unexpected Claude response');
  });
});
