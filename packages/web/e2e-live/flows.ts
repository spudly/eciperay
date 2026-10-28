import {expect, type Page} from '@playwright/test';

import {apiDelete} from './qa.js';

/**
 * UI flows shared by the authenticated live specs (issue #233). Everything
 * created here is `CI —`-prefixed by the caller and deleted in teardown — via
 * the API (apiDelete) as the reliable path, and via the UI where the delete
 * flow itself is the thing under test.
 */

export type CreatedRecipe = {id: string; title: string};

/**
 * Creates a minimal recipe through the real manual-entry form. `onCreated`
 * fires the moment the create POST returns — before the detail-page assertions
 * — so the caller can register the recipe for teardown even if those assertions
 * then fail; the record already exists server-side by then and an unregistered
 * one would leak into the QA dataset.
 */
export const createRecipeViaUi = async (
  page: Page,
  title: string,
  onCreated?: (created: CreatedRecipe) => void,
): Promise<CreatedRecipe> => {
  await page.goto('/add/manual');

  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Servings').fill('4');

  // One ingredient: 400 g of a distinctively named test ingredient.
  if ((await page.getByPlaceholder('Name').count()) === 0) {
    await page.getByRole('button', {name: '+ Add'}).first().click();
  }
  await page.getByPlaceholder('Qty').first().fill('400');
  await page.getByPlaceholder('Unit').first().fill('g');
  await page.getByPlaceholder('Name').first().fill('CI Test Ingredient');

  // One instruction step (the textarea beside the "Reorder step 1" handle).
  await page
    .locator('div:has(> button[aria-label="Reorder step 1"]) > textarea')
    .fill('Mix everything and cook.');

  // The page host's submit label (ManualEntryPage passes "Create Recipe";
  // "Save recipe" exists only in RecipeForm's DEV demo, not in the app).
  // Listen for the create response before submitting: POST /api/recipes
  // persists the recipe before returning 201 with its ID.
  const createResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'POST' &&
      response.status() === 201 &&
      url.pathname === '/api/recipes'
    );
  });
  await page.getByRole('button', {name: 'Create Recipe'}).click();
  const createResponse = await createResponsePromise;
  const {recipeId} = (await createResponse.json()) as {recipeId: string};
  const created: CreatedRecipe = {id: recipeId, title};
  onCreated?.(created);

  // Saving lands on the new recipe's detail page.
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/, {timeout: 15_000});
  await expect(page.getByRole('heading', {name: title})).toBeVisible();
  return created;
};

/** Opens a recipe's detail page from the signed-in list via search. */
export const openRecipeFromList = async (
  page: Page,
  title: string,
): Promise<void> => {
  await page.goto('/recipes');
  await page.getByPlaceholder('Search recipes…').fill(title);
  await page.getByText(title).click();
  await expect(page.getByRole('heading', {name: title})).toBeVisible();
};

/** Deletes a recipe through the list-card UI (in-page confirmation included). */
export const deleteRecipeViaUi = async (
  page: Page,
  title: string,
): Promise<void> => {
  await page.goto('/recipes');
  await page.getByPlaceholder('Search recipes…').fill(title);
  await expect(page.getByText(title)).toBeVisible();
  // exact: the recipe card itself is a button whose accessible name
  // contains the recipe title — a title like "CI — Delete Me …" would
  // otherwise match the substring locator too (strict-mode violation).
  await page.getByRole('button', {name: 'Delete', exact: true}).click();
  // Deletion is confirmed in-page, not with a native dialog (#263):
  // clicking Delete arms a Confirm delete / Cancel pair on the card
  // (RecipeListCard), and only Confirm delete calls onDelete.
  await page.getByRole('button', {name: 'Confirm delete', exact: true}).click();
  await expect(page.getByText(title)).toHaveCount(0, {timeout: 15_000});
};

export const deleteRecipeViaApi = async (
  page: Page,
  id: string,
): Promise<void> => apiDelete(page, `/recipes/${id}`);

export const deleteMealPlanViaApi = async (
  page: Page,
  id: string,
): Promise<void> => apiDelete(page, `/meal-plans/${id}`);
