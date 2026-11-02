import {jest} from '@jest/globals';
import Anthropic from '@anthropic-ai/sdk';

import {
  fakeAnthropicFetch,
  isFakeAiEnabled,
  resolveAnthropicApiKey,
  resolveAnthropicFetch,
} from './fakeAnthropicFetch.js';
import {parseWithClaude} from './parseWithClaude.js';
import {
  AiNutritionResponseSchema,
  AiSubstitutionsResponseSchema,
  RecipeImportSchema,
  parseAiJson,
} from './schemas.js';
import {selectTagIdsForRecipe} from './selectTagsForRecipe.js';

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

type FakeMessage = {
  id: string;
  type: string;
  role: string;
  model: string;
  content: {type: string; text: string}[];
  stop_reason: string;
  stop_sequence: null;
  usage: {input_tokens: number; output_tokens: number};
};

const postMessages = async (
  body: unknown,
): Promise<{status: number; message: FakeMessage}> => {
  const response = await fakeAnthropicFetch(MESSAGES_URL, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return {
    status: response.status,
    message: (await response.json()) as FakeMessage,
  };
};

const responseText = (message: FakeMessage): string => {
  const first = message.content[0];
  if (!first) {
    throw new Error('fake response has no content block');
  }
  return first.text;
};

describe('isFakeAiEnabled', () => {
  const envSnapshot = {...process.env};

  afterEach(() => {
    process.env = {...envSnapshot};
  });

  test('is true only when ECIPERAY_AI_FAKE is "1"', () => {
    process.env['ECIPERAY_AI_FAKE'] = '1';
    expect(isFakeAiEnabled()).toBe(true);
    process.env['ECIPERAY_AI_FAKE'] = 'true';
    expect(isFakeAiEnabled()).toBe(false);
    delete process.env['ECIPERAY_AI_FAKE'];
    expect(isFakeAiEnabled()).toBe(false);
  });
});

describe('resolveAnthropicApiKey', () => {
  const envSnapshot = {...process.env};

  afterEach(() => {
    process.env = {...envSnapshot};
  });

  test('passes the configured key through when fake mode is off', () => {
    delete process.env['ECIPERAY_AI_FAKE'];
    process.env['ANTHROPIC_API_KEY'] = 'real-key';
    expect(resolveAnthropicApiKey()).toBe('real-key');
    delete process.env['ANTHROPIC_API_KEY'];
    expect(resolveAnthropicApiKey()).toBeUndefined();
  });

  test('passes the configured key through when fake mode is on', () => {
    process.env['ECIPERAY_AI_FAKE'] = '1';
    process.env['ANTHROPIC_API_KEY'] = 'real-key';
    expect(resolveAnthropicApiKey()).toBe('real-key');
  });

  test('returns the placeholder key when fake mode is on and no key is set', () => {
    process.env['ECIPERAY_AI_FAKE'] = '1';
    delete process.env['ANTHROPIC_API_KEY'];
    expect(resolveAnthropicApiKey()).toBe('fake-ai');
    process.env['ANTHROPIC_API_KEY'] = '';
    expect(resolveAnthropicApiKey()).toBe('fake-ai');
  });
});

describe('resolveAnthropicFetch', () => {
  const envSnapshot = {...process.env};

  afterEach(() => {
    process.env = {...envSnapshot};
  });

  test('returns the fake fetch only when fake mode is on', () => {
    process.env['ECIPERAY_AI_FAKE'] = '1';
    expect(resolveAnthropicFetch()).toBe(fakeAnthropicFetch);
    delete process.env['ECIPERAY_AI_FAKE'];
    expect(resolveAnthropicFetch()).toBe(globalThis.fetch);
  });
});

describe('fakeAnthropicFetch passthrough', () => {
  test('delegates non-/v1/messages requests to the real fetch', async () => {
    const realResponse = new Response('real', {status: 200});
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(realResponse);
    const init: RequestInit = {method: 'GET'};
    const result = await fakeAnthropicFetch(
      'https://example.com/v1/models',
      init,
    );
    expect(result).toBe(realResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/v1/models',
      init,
    );
    fetchSpy.mockRestore();
  });

  test('delegates requests whose URL cannot be parsed', async () => {
    const realResponse = new Response('real', {status: 200});
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(realResponse);
    const result = await fakeAnthropicFetch('not a url');
    expect(result).toBe(realResponse);
    expect(fetchSpy).toHaveBeenCalledWith('not a url', undefined);
    fetchSpy.mockRestore();
  });
});

describe('fakeAnthropicFetch canned responses', () => {
  test('answers the recipe parser prompt with the canned Imported Soup recipe', async () => {
    const {status, message} = await postMessages({
      model: 'claude-sonnet-4-6',
      system: 'You are a recipe parser. Given raw webpage text, extract it.',
      messages: [{role: 'user', content: 'Some recipe page text'}],
    });
    expect(status).toBe(200);
    expect(message).toMatchObject({
      id: 'msg_fake_ai',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {input_tokens: 1, output_tokens: 1},
    });
    const recipe = parseAiJson(RecipeImportSchema, responseText(message));
    expect(recipe.title).toBe('Imported Soup');
    expect(recipe.description).toBe(
      'A simple, savory soup of salted water, ready in minutes.',
    );
    expect(recipe.servings).toBe(2);
    expect(recipe.prepTimeMin).toBe(5);
    expect(recipe.cookTimeMin).toBe(10);
    expect(recipe.ingredients).toEqual([
      {
        sortOrder: 0,
        name: 'water',
        quantity: 2,
        unit: 'cups',
        notes: null,
        isOptional: false,
      },
      {
        sortOrder: 1,
        name: 'salt',
        quantity: 1,
        unit: 'tsp',
        notes: null,
        isOptional: false,
      },
    ]);
    expect(recipe.instructions).toEqual([
      {stepNumber: 1, body: 'Boil the water, add the salt, and serve.'},
    ]);
  });

  test('answers the recipe generation prompt with the same canned recipe', async () => {
    const {message} = await postMessages({
      system:
        'You are a creative recipe developer. Given a description, invent ' +
        'a complete, coherent, cookable recipe and return ONLY valid JSON.',
      messages: [{role: 'user', content: 'a quick soup'}],
    });
    const recipe = parseAiJson(RecipeImportSchema, responseText(message));
    expect(recipe.title).toBe('Imported Soup');
  });

  test('matches the parser prompt when the system prompt arrives as content blocks', async () => {
    const {message} = await postMessages({
      system: [{type: 'text', text: 'You are a recipe parser.'}],
      messages: [{role: 'user', content: 'page text'}],
    });
    const recipe = parseAiJson(RecipeImportSchema, responseText(message));
    expect(recipe.title).toBe('Imported Soup');
  });

  test('answers tag selection with an empty array', async () => {
    const {message} = await postMessages({
      system: 'Select tags that apply to this recipe. Return ONLY JSON.',
      messages: [{role: 'user', content: 'Available tags: ["Soup"]'}],
    });
    expect(responseText(message)).toBe('[]');
  });

  test('answers the description fallback prompt with one plain sentence', async () => {
    const {message} = await postMessages({
      model: 'claude-haiku-4-5',
      system:
        'Write one appetizing sentence describing the recipe. Return only the description text.',
      messages: [{role: 'user', content: 'Recipe title: Soup'}],
    });
    expect(responseText(message)).toBe(
      'A simple, savory soup that comes together in minutes.',
    );
  });

  test('answers the nutrition prompt with schema-valid fixed values', async () => {
    const {message} = await postMessages({
      messages: [
        {
          role: 'user',
          content:
            'Estimate nutrition per serving for a recipe with 2 servings.\n' +
            'Ingredients: 2 cups water, 1 tsp salt',
        },
      ],
    });
    const nutrition = parseAiJson(
      AiNutritionResponseSchema,
      responseText(message),
    );
    expect(nutrition).toEqual({
      calories: 120,
      proteinG: 2,
      carbsG: 8,
      fatG: 9,
      fiberG: 1,
      sugarG: 1,
      sodiumMg: 480,
      preparedWeightG: 500,
      disclaimer:
        'Fake estimate from the canned AI transport (ECIPERAY_AI_FAKE=1); ' +
        'not a real nutrition analysis.',
    });
  });

  test('finds the nutrition prompt inside array content blocks', async () => {
    const {message} = await postMessages({
      messages: [
        {
          role: 'user',
          content: [
            {type: 'image', source: {type: 'base64'}},
            42,
            'Estimate nutrition per serving for a recipe',
          ],
        },
      ],
    });
    const nutrition = parseAiJson(
      AiNutritionResponseSchema,
      responseText(message),
    );
    expect(nutrition.calories).toBe(120);
  });

  test('answers the substitutions prompt with one schema-valid entry', async () => {
    const {message} = await postMessages({
      messages: [
        {
          role: 'user',
          content:
            'Suggest practical substitutions for these missing ingredients: butter.\n' +
            'Return ONLY JSON array.',
        },
      ],
    });
    const substitutions = parseAiJson(
      AiSubstitutionsResponseSchema,
      responseText(message),
    );
    expect(substitutions).toEqual([
      {
        ingredient: 'the missing ingredient',
        suggestions: ['Use a similar pantry staple in the same quantity'],
      },
    ]);
  });

  test('answers the substitutions prompt when it has leading whitespace', async () => {
    const {message} = await postMessages({
      messages: [
        {role: 'user', content: '  Suggest practical substitutions for x.'},
      ],
    });
    expect(responseText(message)).toContain('the missing ingredient');
  });

  test('answers the step-timing prompt with an empty array', async () => {
    const {message} = await postMessages({
      messages: [
        {
          role: 'user',
          content:
            'Estimate how many minutes each cooking instruction takes ' +
            'for recipe "Soup".',
        },
      ],
    });
    expect(responseText(message)).toBe('[]');
  });

  test('answers unrecognized prompts with the placeholder text', async () => {
    const {message} = await postMessages({
      system: 'You are a culinary assistant.',
      messages: [{role: 'user', content: 'Tweak this recipe.'}],
    });
    expect(responseText(message)).toContain('Fake AI is enabled');
    expect(message.model).toBe('claude-haiku-4-5');
  });

  test('tolerates a malformed JSON body', async () => {
    const {message} = await postMessages('not json at all');
    expect(responseText(message)).toContain('Fake AI is enabled');
    expect(message.model).toBe('claude-haiku-4-5');
  });

  test('tolerates a JSON body that is not an object', async () => {
    const {message} = await postMessages('42');
    expect(responseText(message)).toContain('Fake AI is enabled');
  });

  test('tolerates non-array messages and non-record message entries', async () => {
    const {message} = await postMessages({
      system: 'You are a recipe parser.',
      messages: 'not an array',
    });
    // The system prompt alone still selects the canned recipe.
    expect(responseText(message)).toContain('Imported Soup');

    const {message: second} = await postMessages({messages: [42]});
    expect(responseText(second)).toContain('Fake AI is enabled');
  });

  test('defaults the model when the body names an empty or non-string model', async () => {
    const {message: emptyModel} = await postMessages({model: ''});
    expect(emptyModel.model).toBe('claude-haiku-4-5');
    const {message: numericModel} = await postMessages({model: 42});
    expect(numericModel.model).toBe('claude-haiku-4-5');
  });

  test('reads the body from a Request input when no init body is given', async () => {
    const request = new Request(MESSAGES_URL, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        system: 'Select tags that apply to this recipe.',
        messages: [{role: 'user', content: 'tags?'}],
      }),
    });
    const response = await fakeAnthropicFetch(request);
    const message = (await response.json()) as FakeMessage;
    expect(responseText(message)).toBe('[]');
  });

  test('accepts a URL input', async () => {
    const response = await fakeAnthropicFetch(new URL(MESSAGES_URL), {
      method: 'POST',
      body: JSON.stringify({
        system: 'Select tags that apply to this recipe.',
        messages: [{role: 'user', content: 'tags?'}],
      }),
    });
    const message = (await response.json()) as FakeMessage;
    expect(responseText(message)).toBe('[]');
  });

  test('treats a non-string init body without a Request as an empty request', async () => {
    const response = await fakeAnthropicFetch(MESSAGES_URL, {
      method: 'POST',
      body: new URLSearchParams('a=b'),
    });
    const message = (await response.json()) as FakeMessage;
    expect(responseText(message)).toContain('Fake AI is enabled');
    expect(message.model).toBe('claude-haiku-4-5');
  });
});

describe('SDK integration through the fake fetch', () => {
  const client = new Anthropic({
    apiKey: 'fake-ai',
    maxRetries: 0,
    fetch: fakeAnthropicFetch,
  });

  test('parseWithClaude returns the canned Imported Soup recipe', async () => {
    const recipe = await parseWithClaude(
      'Imported Soup\n2 cups water\n1 tsp salt',
      null,
      client,
    );
    expect(recipe.title).toBe('Imported Soup');
    expect(recipe.description).toBe(
      'A simple, savory soup of salted water, ready in minutes.',
    );
    expect(
      recipe.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`),
    ).toEqual(['2 cups water', '1 tsp salt']);
  });

  test('selectTagIdsForRecipe returns no tags', async () => {
    const recipe = await parseWithClaude('page text', null, client);
    const tagIds = await selectTagIdsForRecipe(
      recipe,
      [{id: 'tag-1', name: 'Soup'}],
      client,
    );
    expect(tagIds).toEqual([]);
  });
});
