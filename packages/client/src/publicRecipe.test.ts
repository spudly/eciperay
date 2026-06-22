import type {PublicRecipeDetail, RecipeDetail} from '@eciperay/types';

import {publicRecipeToRecipeDetail} from './publicRecipe.js';

describe('publicRecipeToRecipeDetail', () => {
  test('adds empty userId for components that expect RecipeDetail', () => {
    const publicRecipe: PublicRecipeDetail = {
      id: 'recipe-1',
      lifecycleStatus: 'idea',
      visibility: 'public',
      slug: 'pasta',
      contentRevision: 1,
      developmentStatus: 'idea',
      clonedFromRecipeId: null,
      versionId: 'version-1',
      versionNumber: 1,
      title: 'Pasta',
      description: null,
      servings: 4,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: null,
      sourceUrl: null,
      createdVia: 'manual',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      ingredients: [],
      instructions: [],
      tags: [],
    };

    expect(publicRecipeToRecipeDetail(publicRecipe)).toEqual({
      ...publicRecipe,
      userId: '',
    } satisfies RecipeDetail);
  });
});
