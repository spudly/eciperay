import {jest} from '@jest/globals';

import {nockAnthropicMessage} from '../test/mockNockAnthropic.js';

import {anthropic} from './anthropic.js';
import {generateRecipeImagePrompt} from './generateRecipeImagePrompt.js';

describe('generateRecipeImagePrompt', () => {
  test('returns trimmed prompt text from Claude', async () => {
    nockAnthropicMessage('  A bowl of creamy pasta with herbs  ');
    const prompt = await generateRecipeImagePrompt({
      title: 'Creamy Pasta',
      description: 'Comfort food',
      ingredients: ['pasta', 'cream'],
    });
    expect(prompt).toBe('A bowl of creamy pasta with herbs');
  });

  test('falls back when description and ingredients are empty', async () => {
    nockAnthropicMessage('A plated dish');
    const prompt = await generateRecipeImagePrompt({
      title: 'Mystery Dish',
      ingredients: [],
    });
    expect(prompt).toBe('A plated dish');
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
      generateRecipeImagePrompt({title: 'Soup', ingredients: ['broth']}),
    ).rejects.toThrow('Unexpected Claude response');
  });
});
