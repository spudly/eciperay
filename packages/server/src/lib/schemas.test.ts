import {z} from 'zod';

import {
  AiChatResponseSchema,
  ChatMessageSchema,
  ImportAiSchema,
  ImportImageSchema,
  ImportTextSchema,
  ImportUrlSchema,
  RecipeInputSchema,
  RecipeNoteInputSchema,
  RecipeUpdateSchema,
  SyncUserSchema,
  TagInputSchema,
} from './schemas.js';
import {parseAiJson} from './validate.js';

const validIngredient = {
  sortOrder: 0,
  name: 'Flour',
  quantity: 2,
  unit: 'cups',
  notes: null,
  isOptional: false,
};
const validInstruction = {stepNumber: 1, body: 'Mix well'};
const validRecipeInput = {
  title: 'Pasta',
  servings: 4,
  ingredients: [validIngredient],
  instructions: [validInstruction],
  tagIds: [],
};

describe('RecipeInputSchema', () => {
  test('accepts valid recipe input', () => {
    expect(() => RecipeInputSchema.parse(validRecipeInput)).not.toThrow();
  });

  test('rejects missing title', () => {
    expect(() =>
      RecipeInputSchema.parse({...validRecipeInput, title: ''}),
    ).toThrow(z.ZodError);
  });

  test('rejects non-UUID tagIds', () => {
    expect(() =>
      RecipeInputSchema.parse({...validRecipeInput, tagIds: ['not-a-uuid']}),
    ).toThrow(z.ZodError);
  });
});

describe('RecipeUpdateSchema', () => {
  test('accepts partial update with just a title', () => {
    expect(() => RecipeUpdateSchema.parse({title: 'New Title'})).not.toThrow();
  });

  test('rejects servings of 0 (must be positive)', () => {
    expect(() => RecipeUpdateSchema.parse({servings: 0})).toThrow(z.ZodError);
  });
});

describe('TagInputSchema', () => {
  test('accepts valid tag', () => {
    expect(() => TagInputSchema.parse({name: 'Dinner'})).not.toThrow();
  });

  test('rejects empty name', () => {
    expect(() => TagInputSchema.parse({name: ''})).toThrow(z.ZodError);
  });
});

describe('RecipeNoteInputSchema', () => {
  test('accepts non-empty content', () => {
    expect(() =>
      RecipeNoteInputSchema.parse({content: 'Delicious'}),
    ).not.toThrow();
  });

  test('rejects empty content', () => {
    expect(() => RecipeNoteInputSchema.parse({content: ''})).toThrow(
      z.ZodError,
    );
  });
});

describe('ChatMessageSchema', () => {
  test('accepts non-empty message', () => {
    expect(() =>
      ChatMessageSchema.parse({message: 'How do I reduce salt?'}),
    ).not.toThrow();
  });

  test('rejects empty message', () => {
    expect(() => ChatMessageSchema.parse({message: ''})).toThrow(z.ZodError);
  });
});

describe('ImportUrlSchema', () => {
  test('accepts a valid URL', () => {
    expect(() =>
      ImportUrlSchema.parse({url: 'https://example.com/recipe'}),
    ).not.toThrow();
  });

  test('rejects a non-URL string', () => {
    expect(() => ImportUrlSchema.parse({url: 'not-a-url'})).toThrow(z.ZodError);
  });
});

describe('ImportImageSchema', () => {
  test('accepts a non-empty base64 string', () => {
    expect(() =>
      ImportImageSchema.parse({imageBase64: 'abc123'}),
    ).not.toThrow();
  });

  test('rejects empty imageBase64', () => {
    expect(() => ImportImageSchema.parse({imageBase64: ''})).toThrow(
      z.ZodError,
    );
  });
});

describe('ImportTextSchema', () => {
  test('accepts non-empty text', () => {
    expect(() => ImportTextSchema.parse({text: 'Pasta recipe'})).not.toThrow();
  });

  test('accepts large pasted HTML within the raw limit', () => {
    expect(() =>
      ImportTextSchema.parse({text: `<p>${'x'.repeat(200_000)}</p>`}),
    ).not.toThrow();
  });

  test('rejects empty text', () => {
    expect(() => ImportTextSchema.parse({text: ''})).toThrow(z.ZodError);
  });

  test('rejects raw text above the request size limit', () => {
    expect(() =>
      ImportTextSchema.parse({text: 'x'.repeat(10_000_001)}),
    ).toThrow(z.ZodError);
  });
});

describe('ImportAiSchema', () => {
  test('accepts a valid prompt', () => {
    expect(() =>
      ImportAiSchema.parse({prompt: 'quick weeknight vegetarian pasta for 4'}),
    ).not.toThrow();
  });

  test('trims prompt whitespace', () => {
    const result = ImportAiSchema.parse({
      prompt: '  simple chocolate chip cookies for 12  ',
    });
    expect(result.prompt).toBe('simple chocolate chip cookies for 12');
  });

  test('rejects prompts shorter than 10 characters', () => {
    expect(() => ImportAiSchema.parse({prompt: 'pasta'})).toThrow(z.ZodError);
  });

  test('rejects prompts above the max length', () => {
    expect(() => ImportAiSchema.parse({prompt: 'x'.repeat(2001)})).toThrow(
      z.ZodError,
    );
  });
});

describe('SyncUserSchema', () => {
  test('accepts an empty body', () => {
    expect(() => SyncUserSchema.parse({})).not.toThrow();
  });

  test('accepts an optional display name', () => {
    expect(() =>
      SyncUserSchema.parse({displayName: 'Test User'}),
    ).not.toThrow();
  });

  test('rejects a display name that is too long', () => {
    expect(() => SyncUserSchema.parse({displayName: 'x'.repeat(101)})).toThrow(
      z.ZodError,
    );
  });
});

describe('AiChatResponseSchema', () => {
  test('accepts ingredient diffs missing sortOrder and isOptional', () => {
    const parsed = parseAiJson(
      AiChatResponseSchema,
      JSON.stringify({
        reasoning: 'More moisture.',
        summary_of_changes: 'Added yogurt.',
        diff: {
          ingredients: [
            {name: 'Greek yogurt', quantity: 0.5, unit: 'cup', notes: null},
          ],
        },
      }),
    );
    expect(parsed.diff.ingredients).toEqual([
      {
        sortOrder: 0,
        name: 'Greek yogurt',
        quantity: 0.5,
        unit: 'cup',
        notes: null,
        isOptional: false,
      },
    ]);
  });

  test('accepts instruction diffs missing stepNumber', () => {
    const parsed = parseAiJson(
      AiChatResponseSchema,
      JSON.stringify({
        reasoning: 'Clearer steps.',
        summary_of_changes: 'Rewrote steps.',
        diff: {instructions: [{body: 'Mix and bake.'}]},
      }),
    );
    expect(parsed.diff.instructions).toEqual([
      {stepNumber: 1, body: 'Mix and bake.'},
    ]);
  });

  test('coerces string ingredient quantities', () => {
    const parsed = parseAiJson(
      AiChatResponseSchema,
      JSON.stringify({
        reasoning: 'Adjusted flour.',
        summary_of_changes: 'Less flour.',
        diff: {
          ingredients: [
            {
              sortOrder: 0,
              name: 'flour',
              quantity: '1.5',
              unit: 'cups',
              notes: null,
              isOptional: false,
            },
          ],
        },
      }),
    );
    expect(parsed.diff.ingredients?.[0]?.quantity).toBe(1.5);
  });

  test('coerces empty string ingredient quantities to null', () => {
    const parsed = parseAiJson(
      AiChatResponseSchema,
      JSON.stringify({
        reasoning: 'Adjusted salt.',
        summary_of_changes: 'To taste.',
        diff: {
          ingredients: [
            {
              sortOrder: 0,
              name: 'salt',
              quantity: '',
              unit: null,
              notes: null,
              isOptional: false,
            },
          ],
        },
      }),
    );
    expect(parsed.diff.ingredients?.[0]?.quantity).toBeNull();
  });

  test('rejects non-numeric string ingredient quantities', () => {
    expect(() =>
      parseAiJson(
        AiChatResponseSchema,
        JSON.stringify({
          reasoning: 'Adjusted flour.',
          summary_of_changes: 'Less flour.',
          diff: {
            ingredients: [
              {
                sortOrder: 0,
                name: 'flour',
                quantity: 'not-a-number',
                unit: 'cups',
                notes: null,
                isOptional: false,
              },
            ],
          },
        }),
      ),
    ).toThrow();
  });

  test('rejects non-array ingredient and instruction diffs', () => {
    expect(() =>
      parseAiJson(
        AiChatResponseSchema,
        JSON.stringify({
          reasoning: 'Bad shape.',
          summary_of_changes: 'Bad shape.',
          diff: {ingredients: 'not-an-array'},
        }),
      ),
    ).toThrow();

    expect(() =>
      parseAiJson(
        AiChatResponseSchema,
        JSON.stringify({
          reasoning: 'Bad shape.',
          summary_of_changes: 'Bad shape.',
          diff: {instructions: 42},
        }),
      ),
    ).toThrow();
  });
});
