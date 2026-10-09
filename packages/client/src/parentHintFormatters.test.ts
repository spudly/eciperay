import {
  formatParentListSummary,
  formatParentScalarHint,
  formatParentTagNames,
} from './parentHintFormatters.js';
import {makeRecipeVersionDetail} from './test/fixtures/recipe.js';

describe('formatParentScalarHint', () => {
  const parent = makeRecipeVersionDetail({
    title: 'Original',
    description: '',
    prepTimeMin: null,
    cookTimeMin: null,
    imageUrl: null,
    sourceUrl: null,
  });

  test('formats empty and null scalar values', () => {
    expect(formatParentScalarHint(parent, 'description')).toBe('(empty)');
    expect(formatParentScalarHint(parent, 'prepTimeMin')).toBe('(none)');
    expect(formatParentScalarHint(parent, 'imageUrl')).toBe('(no image)');
    expect(formatParentScalarHint(parent, 'sourceUrl')).toBe('(none)');
    expect(
      formatParentScalarHint(
        makeRecipeVersionDetail({description: '   '}),
        'description',
      ),
    ).toBe('(empty)');
    expect(
      formatParentScalarHint(
        makeRecipeVersionDetail({description: 'Tasty'}),
        'description',
      ),
    ).toBe('Tasty');
    expect(
      formatParentScalarHint(
        makeRecipeVersionDetail({cookTimeMin: null}),
        'cookTimeMin',
      ),
    ).toBe('(none)');
  });

  test('formats image url filename', () => {
    const withImage = makeRecipeVersionDetail({
      imageUrl: 'https://cdn.example.com/recipes/photo.jpg',
    });
    expect(formatParentScalarHint(withImage, 'imageUrl')).toBe('photo.jpg');
  });

  test('formats scalar title and servings', () => {
    const parent = makeRecipeVersionDetail({
      title: 'Stew',
      servings: 6,
      prepTimeMin: 15,
      cookTimeMin: 45,
      sourceUrl: 'https://example.com/recipe',
    });
    expect(formatParentScalarHint(parent, 'title')).toBe('Stew');
    expect(formatParentScalarHint(parent, 'servings')).toBe('6');
    expect(formatParentScalarHint(parent, 'prepTimeMin')).toBe('15 min');
    expect(formatParentScalarHint(parent, 'cookTimeMin')).toBe('45 min');
    expect(formatParentScalarHint(parent, 'sourceUrl')).toBe(
      'https://example.com/recipe',
    );
  });

  test('falls back for invalid image urls', () => {
    expect(
      formatParentScalarHint(
        makeRecipeVersionDetail({imageUrl: 'not-a-valid-url'}),
        'imageUrl',
      ),
    ).toBe('not-a-valid-url');
    expect(
      formatParentScalarHint(
        makeRecipeVersionDetail({imageUrl: 'https://cdn.example.com/'}),
        'imageUrl',
      ),
    ).toBe('https://cdn.example.com/');
  });
});

describe('formatParentListSummary', () => {
  test('summarizes ingredients and instructions', () => {
    const parent = makeRecipeVersionDetail({
      ingredients: [
        {
          id: 'i-1',
          recipeVersionId: 'v-1',
          sortOrder: 0,
          name: 'Flour',
          quantity: 1,
          unit: 'cup',
          notes: null,
          isOptional: false,
        },
        {
          id: 'i-2',
          recipeVersionId: 'v-1',
          sortOrder: 1,
          name: 'Sugar',
          quantity: 2,
          unit: 'tbsp',
          notes: null,
          isOptional: false,
        },
        {
          id: 'i-3',
          recipeVersionId: 'v-1',
          sortOrder: 2,
          name: 'Salt',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [
        {
          id: 's-1',
          recipeVersionId: 'v-1',
          stepNumber: 1,
          body: 'Mix',
          estimatedDurationMin: null,
        },
        {
          id: 's-2',
          recipeVersionId: 'v-1',
          stepNumber: 2,
          body: 'Bake',
          estimatedDurationMin: null,
        },
      ],
    });
    expect(formatParentListSummary(parent, 'ingredients')).toBe(
      'Parent had 3 ingredients: Flour, Sugar (+1 more)',
    );
    expect(formatParentListSummary(parent, 'instructions')).toBe(
      'Parent had 2 steps: Mix (+1 more)',
    );
  });

  test('summarizes empty ingredient and instruction lists', () => {
    const parent = makeRecipeVersionDetail({ingredients: [], instructions: []});
    expect(formatParentListSummary(parent, 'ingredients')).toBe(
      'Parent had no ingredients',
    );
    expect(formatParentListSummary(parent, 'instructions')).toBe(
      'Parent had no steps',
    );
  });

  test('summarizes single-item lists without suffix', () => {
    const parent = makeRecipeVersionDetail({
      ingredients: [
        {
          id: 'i-1',
          recipeVersionId: 'v-1',
          sortOrder: 0,
          name: 'Salt',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [
        {
          id: 's-1',
          recipeVersionId: 'v-1',
          stepNumber: 1,
          body: 'Stir',
          estimatedDurationMin: null,
        },
      ],
    });
    expect(formatParentListSummary(parent, 'ingredients')).toBe(
      'Parent had 1 ingredients: Salt',
    );
    expect(formatParentListSummary(parent, 'instructions')).toBe(
      'Parent had 1 steps: Stir',
    );
  });
});

describe('formatParentTagNames', () => {
  test('formats tag names or none', () => {
    expect(
      formatParentTagNames(
        makeRecipeVersionDetail({
          tags: [
            {
              id: 'tag-1',
              userId: null,
              name: 'Dinner',
              color: '#6366f1',
              isPreset: false,
            },
          ],
        }),
      ),
    ).toBe('Dinner');
    expect(formatParentTagNames(makeRecipeVersionDetail({tags: []}))).toBe(
      '(none)',
    );
  });
});
