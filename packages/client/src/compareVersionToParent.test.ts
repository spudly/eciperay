import type {IngredientInput} from '@eciperay/types';

import {
  compareVersionToParent,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  revertVersionScalar,
} from './compareVersionToParent.js';
import {recipeVersionDetailToInput} from './recipeDetailToInput.js';
import {makeRecipeVersionDetail} from './test/fixtures/recipe.js';

describe('compareVersionToParent', () => {
  const parent = makeRecipeVersionDetail({
    title: 'Original',
    description: 'Original desc',
    servings: 4,
    prepTimeMin: 10,
    cookTimeMin: 20,
    imageUrl: 'https://example.com/a.jpg',
    sourceUrl: 'https://example.com/source',
    tags: [
      {
        id: 'tag-1',
        userId: 'user-uuid-1',
        name: 'Dinner',
        color: '#6366f1',
        isPreset: false,
      },
    ],
  });

  test('reports no changes when matching parent', () => {
    const current = recipeVersionDetailToInput(parent);
    const diff = compareVersionToParent(parent, current);
    expect(diff).toEqual({
      changedScalars: [],
      ingredientsChanged: false,
      instructionsChanged: false,
      tagsChanged: false,
    });
  });

  test('normalizes optional ingredient fields when comparing', () => {
    const parentWithOptional = makeRecipeVersionDetail({
      ingredients: [
        {
          id: 'i-1',
          recipeVersionId: parent.id,
          sortOrder: 0,
          name: 'Salt',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: true,
        },
      ],
      instructions: [],
      tags: [],
    });
    const diff = compareVersionToParent(parentWithOptional, {
      ...recipeVersionDetailToInput(parentWithOptional),
      ingredients: [
        {sortOrder: 0, name: 'Salt', isOptional: false} as IngredientInput,
      ],
    });
    expect(diff.ingredientsChanged).toBe(true);
  });

  test('treats explicit optional flags as equivalent when matching', () => {
    const parentWithOptional = makeRecipeVersionDetail({
      ingredients: [
        {
          id: 'i-1',
          recipeVersionId: parent.id,
          sortOrder: 0,
          name: 'Salt',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: true,
        },
      ],
      instructions: [],
      tags: [],
    });
    const diff = compareVersionToParent(parentWithOptional, {
      ...recipeVersionDetailToInput(parentWithOptional),
      ingredients: [
        {
          sortOrder: 0,
          name: 'Salt',
          quantity: null,
          unit: null,
          notes: null,
          isOptional: true,
        },
      ],
    });
    expect(diff.ingredientsChanged).toBe(false);
  });

  test('handles null scalar fields on parent', () => {
    const sparseParent = makeRecipeVersionDetail({
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: null,
      sourceUrl: null,
      tags: [],
    });
    const diff = compareVersionToParent(
      sparseParent,
      recipeVersionDetailToInput(sparseParent),
    );
    expect(diff.changedScalars).toEqual([]);
  });

  test('detects scalar and collection changes', () => {
    const current = recipeVersionDetailToInput(parent);
    const diff = compareVersionToParent(parent, {
      ...current,
      title: 'Updated',
      description: 'New desc',
      servings: 6,
      prepTimeMin: 5,
      cookTimeMin: 25,
      imageUrl: 'https://example.com/b.jpg',
      sourceUrl: 'https://example.com/other',
      ingredients: [
        {
          sortOrder: 0,
          name: 'Changed flour',
          quantity: 2,
          unit: 'cups',
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [{stepNumber: 1, body: 'Different step'}],
      tagIds: ['tag-2'],
    });
    expect(diff.changedScalars).toEqual([
      'title',
      'description',
      'servings',
      'prepTimeMin',
      'cookTimeMin',
      'imageUrl',
      'sourceUrl',
    ]);
    expect(diff.ingredientsChanged).toBe(true);
    expect(diff.instructionsChanged).toBe(true);
    expect(diff.tagsChanged).toBe(true);
  });

  test('reverts scalar fields and parent collections from parent', () => {
    expect(revertVersionScalar(parent, 'title')).toBe('Original');
    expect(revertVersionScalar(parent, 'description')).toBe('Original desc');
    expect(revertVersionScalar(parent, 'servings')).toBe(4);
    expect(revertVersionScalar(parent, 'prepTimeMin')).toBe(10);
    expect(revertVersionScalar(parent, 'cookTimeMin')).toBe(20);
    expect(revertVersionScalar(parent, 'imageUrl')).toBe(
      'https://example.com/a.jpg',
    );
    expect(revertVersionScalar(parent, 'sourceUrl')).toBe(
      'https://example.com/source',
    );
    expect(parentIngredientsInput(parent)[0]?.name).toBe('Flour');
    expect(parentInstructionsInput(parent)[0]?.body).toBe(
      'Mix dry ingredients',
    );
    expect(parentTagIds(parent)).toEqual(['tag-1']);
  });
});
