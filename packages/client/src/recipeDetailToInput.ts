import type {RecipeDetail, RecipeVersionDetail} from '@eciperay/types';

import type {RecipeFormInitial} from './recipeFormRows.js';

const mapIngredients = (
  ingredients: RecipeDetail['ingredients'],
): RecipeFormInitial['ingredients'] =>
  [...ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({id, sortOrder, name, quantity, unit, notes, isOptional}) => ({
      key: id,
      // The persisted ID rides along (#643): instruction
      // ingredientReferences point at these IDs, and the server
      // preserves a supplied ID across a version rewrite so the
      // references never dangle.
      id,
      sortOrder,
      name,
      quantity,
      unit,
      notes,
      isOptional,
    }));

const mapInstructions = (
  instructions: RecipeDetail['instructions'],
): RecipeFormInitial['instructions'] =>
  [...instructions]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map(({id, stepNumber, body, ingredientReferences}) => ({
      key: id,
      stepNumber,
      body,
      // Stored ingredient links (#643) enter the form so the editor
      // can show and correct them; dropping them here would erase
      // every link on the next save.
      ingredientReferences: [...(ingredientReferences ?? [])],
    }));

const mapContentToFormInitial = (detail: {
  title: string;
  description: string | null;
  servings: number;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  ingredients: RecipeDetail['ingredients'];
  instructions: RecipeDetail['instructions'];
  tags: RecipeDetail['tags'];
}): RecipeFormInitial => ({
  title: detail.title,
  description: detail.description,
  servings: detail.servings,
  prepTimeMin: detail.prepTimeMin,
  cookTimeMin: detail.cookTimeMin,
  imageUrl: detail.imageUrl,
  sourceUrl: detail.sourceUrl,
  ingredients: mapIngredients(detail.ingredients),
  instructions: mapInstructions(detail.instructions),
  tagIds: detail.tags.map(tag => tag.id),
});

export const recipeDetailToInput = (detail: RecipeDetail): RecipeFormInitial =>
  mapContentToFormInitial(detail);

export const recipeVersionDetailToInput = (
  detail: RecipeVersionDetail,
): RecipeFormInitial => mapContentToFormInitial(detail);
