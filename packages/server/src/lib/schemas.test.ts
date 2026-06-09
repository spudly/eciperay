import {z} from 'zod';

import {
  ChatMessageSchema,
  ImportImageSchema,
  ImportUrlSchema,
  RecipeInputSchema,
  RecipeNoteInputSchema,
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

describe('SyncUserSchema', () => {
  test('accepts a valid email', () => {
    expect(() =>
      SyncUserSchema.parse({email: 'test@example.com'}),
    ).not.toThrow();
  });

  test('rejects an invalid email', () => {
    expect(() => SyncUserSchema.parse({email: 'not-an-email'})).toThrow(
      z.ZodError,
    );
  });
});
