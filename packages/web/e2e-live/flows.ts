import {expect, type Page} from '@playwright/test';

import {apiDelete} from './qa.js';

/**
 * UI flows shared by the authenticated live specs (issue #233). Everything
 * created here is `CI —`-prefixed by the caller and deleted in teardown — via
 * the API (apiDelete) as the reliable path, and via the UI where the delete
 * flow itself is the thing under test.
 */

export type CreatedRecipe = {id: string; title: string};

/** Creates a minimal recipe through the real manual-entry form. */
export const createRecipeViaUi = async (
  page: Page,
  title: string,
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

  await page.getByRole('button', {name: 'Save recipe'}).click();

  // Saving lands on the new recipe's detail page.
  await expect(page).toHaveURL(/\/recipes\/[^/]+$/, {timeout: 15_000});
  await expect(page.getByRole('heading', {name: title})).toBeVisible();
  const id = page.url().split('/recipes/')[1]!;
  return {id, title};
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

/** Deletes a recipe through the list-card UI (confirm dialog included). */
export const deleteRecipeViaUi = async (
  page: Page,
  title: string,
): Promise<void> => {
  await page.goto('/recipes');
  await page.getByPlaceholder('Search recipes…').fill(title);
  await expect(page.getByText(title)).toBeVisible();
  page.once('dialog', dialog => {
    void dialog.accept();
  });
  await page.getByRole('button', {name: 'Delete'}).click();
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
