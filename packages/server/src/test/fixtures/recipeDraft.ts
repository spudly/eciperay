import type {RecipeDiff, RecipeDraft} from '@recipoo/types';

import {makeRecipeDetail} from './recipe.js';

export const makeRecipeDiff = (
  overrides: Partial<RecipeDiff> = {},
): RecipeDiff => ({title: 'Updated Title', ...overrides});

export const makeRecipeDraft = (
  overrides: Partial<RecipeDraft> = {},
): RecipeDraft => ({
  id: 'draft-uuid-1',
  recipeId: 'recipe-uuid-1',
  status: 'pending',
  snapshotJson: makeRecipeDetail(),
  diffJson: makeRecipeDiff(),
  trigger: 'ai_chat',
  summaryOfChanges: 'Changed the title.',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
