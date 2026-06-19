import {z} from 'zod';

import {
  ImportAiSchema,
  ImportImageSchema,
  ImportTextSchema,
  ImportUrlSchema,
  RecipeInputSchema,
  RecipeUpdateSchema,
  SyncUserSchema,
  TagInputSchema,
} from './schemas.js';

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
  test('accepts imageUrl update', () => {
    expect(() =>
      RecipeUpdateSchema.parse({imageUrl: 'https://example.com/img.jpg'}),
    ).not.toThrow();
  });

  test('rejects missing imageUrl', () => {
    expect(() => RecipeUpdateSchema.parse({})).toThrow(z.ZodError);
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
