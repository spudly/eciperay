import {
  anthropicCreateSpy,
  nockAnthropicMessage,
} from '../test/mockNockAnthropic.js';

import {
  formatRecipeImageIngredient,
  generateRecipeImagePrompt,
} from './generateRecipeImagePrompt.js';

describe('formatRecipeImageIngredient', () => {
  test('formats quantity, unit, and name', () => {
    expect(
      formatRecipeImageIngredient({name: 'flour', quantity: 2, unit: 'cups'}),
    ).toBe('2 cups flour');
  });

  test('returns name only when quantity and unit are missing', () => {
    expect(formatRecipeImageIngredient({name: 'salt'})).toBe('salt');
  });

  test('returns empty string for blank names', () => {
    expect(formatRecipeImageIngredient({name: '   '})).toBe('');
  });
});

describe('generateRecipeImagePrompt', () => {
  test('returns trimmed prompt text from Claude', async () => {
    nockAnthropicMessage('  A bowl of creamy pasta with herbs  ');
    const prompt = await generateRecipeImagePrompt({
      title: 'Creamy Pasta',
      description: 'Comfort food',
      ingredients: [
        {name: 'pasta', quantity: 200, unit: 'g'},
        {name: 'cream', quantity: 1, unit: 'cup'},
      ],
      instructions: ['Boil pasta', 'Stir in cream'],
    });
    expect(prompt).toBe('A bowl of creamy pasta with herbs');
  });

  test('includes formatted ingredients and instructions in the Claude request', async () => {
    nockAnthropicMessage('Prompt');
    await generateRecipeImagePrompt({
      title: 'Creamy Pasta',
      description: 'Comfort food',
      ingredients: [{name: 'pasta', quantity: 200, unit: 'g'}],
      instructions: ['Boil pasta'],
    });
    const message = anthropicCreateSpy.mock.calls.at(-1)?.[0]?.messages[0];
    expect(message?.content).toContain('200 g pasta');
    expect(message?.content).toContain('Boil pasta');
  });

  test('falls back when description, ingredients, and instructions are empty', async () => {
    nockAnthropicMessage('A plated dish');
    const prompt = await generateRecipeImagePrompt({
      title: 'Mystery Dish',
      ingredients: [],
      instructions: [],
    });
    expect(prompt).toBe('A plated dish');
  });

  test('throws on unexpected Claude response type', async () => {
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
    await expect(
      generateRecipeImagePrompt({
        title: 'Soup',
        ingredients: [{name: 'broth'}],
        instructions: [],
      }),
    ).rejects.toThrow('Unexpected Claude response');
  });
});
