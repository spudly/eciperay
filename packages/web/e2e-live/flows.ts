import {expect, type Page} from '@playwright/test';

import {apiDelete, getAccessToken} from './qa.js';

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
  // Scoped to <main>: the shell header carries its own search box
  // with the same placeholder (#409).
  await page.getByRole('main').getByPlaceholder('Search recipes…').fill(title);
  await page.getByText(title).click();
  await expect(page.getByRole('heading', {name: title})).toBeVisible();
};

/**
 * Deletes a recipe through the UI (in-page confirmation included). Since the
 * recipes list adopted the design-system RecipesPage (B7 cluster 5), list rows
 * offer no Delete — deleting is a detail-page action — so this opens the recipe
 * from the list and deletes it from its detail page.
 */
export const deleteRecipeViaUi = async (
  page: Page,
  title: string,
): Promise<void> => {
  await openRecipeFromList(page, title);
  await page.getByRole('button', {name: 'Delete', exact: true}).click();
  // Deletion is confirmed in-page, not with a native dialog (#263):
  // clicking Delete arms a Confirm delete / Cancel pair in the detail
  // page's Overview actions, and only Confirm delete deletes.
  await page.getByRole('button', {name: 'Confirm delete', exact: true}).click();
  // Confirming returns to the recipes list; search for the recipe there
  // and verify the (server-filtered) list no longer contains it.
  await expect(page).toHaveURL(/\/recipes$/);
  const searchResponse = page.waitForResponse(
    response =>
      response.url().includes('/api/recipes') &&
      response.url().includes('search=') &&
      response.request().method() === 'GET',
  );
  // Scoped to <main>: the shell header carries its own search box
  // with the same placeholder (#409).
  await page.getByRole('main').getByPlaceholder('Search recipes…').fill(title);
  const response = await searchResponse;
  expect(response.ok()).toBe(true);
  const recipes = (await response.json()) as Array<{title?: string}>;
  expect(recipes.some(recipe => recipe.title === title)).toBe(false);
  await expect(page.getByText(title)).toHaveCount(0, {timeout: 15_000});
};

export const deleteRecipeViaApi = async (
  page: Page,
  id: string,
): Promise<void> => apiDelete(page, `/recipes/${id}`);

/**
 * Deletes every library recipe whose title matches exactly, through the
 * real API. The imports spec's self-healing pre-clean (issue #492): the
 * canned fake-AI parse always produces the same title + ingredients, so a
 * copy leaked by an earlier suite run (imported, then neither renamed nor
 * deleted because a later step failed) makes every later import draw the
 * duplicate warning (409, issue #296) instead of creating a recipe.
 * The caller must have navigated to an app page first so the session
 * token is readable.
 */
export const deleteRecipesByTitleViaApi = async (
  page: Page,
  title: string,
  expectedIngredientNames?: readonly string[],
): Promise<void> => {
  const token = await getAccessToken(page);
  if (!token) {
    throw new Error(
      `deleteRecipesByTitleViaApi: no access token to list recipes titled "${title}"; ` +
        'a leaked copy may still exist in the QA dataset.',
    );
  }
  const ids = await page.evaluate(
    async ({title: t, token: tk, ingredientNames}) => {
      // Same normalization the server's duplicate guard applies
      // (findDuplicateRecipe): case-insensitive, whitespace collapsed —
      // a leaked copy whose title differs only in case/spacing still
      // blocks the import, so it must be found here too.
      const normalize = (value: string): string =>
        value.trim().replaceAll(/\s+/g, ' ').toLowerCase();
      const headers = {Authorization: `Bearer ${tk}`};
      // The list endpoint paginates (default limit 100): walk every
      // page, or a leaked copy behind 100 newer matches is missed.
      const recipes: Array<{
        id?: string;
        recipeId?: string;
        title?: string;
      }> = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const response = await fetch(
          `/api/recipes?search=${encodeURIComponent(t)}&limit=${pageSize}&offset=${offset}`,
          {headers},
        );
        if (!response.ok) {
          // A failed search is not an empty library: surface it, or
          // the import test fails later with no hint the pre-clean
          // never ran.
          throw new Error(
            `deleteRecipesByTitleViaApi: recipe search failed with status ${response.status}`,
          );
        }
        const pageRecipes = (await response.json()) as typeof recipes;
        recipes.push(...pageRecipes);
        if (pageRecipes.length < pageSize) {
          break;
        }
      }
      const candidates = recipes
        .filter(
          recipe =>
            typeof recipe.title === 'string' &&
            normalize(recipe.title) === normalize(t),
        )
        .map(recipe => recipe.id ?? recipe.recipeId)
        .filter((id): id is string => typeof id === 'string');
      if (!ingredientNames) {
        return candidates;
      }
      // Only a recipe that can actually block the import — same
      // normalized title AND ingredient fingerprint, the duplicate
      // guard's rule — may be deleted; a same-title recipe with
      // different ingredients is not a leaked copy of this import.
      const expected = ingredientNames.map(normalize).sort();
      const blocking: string[] = [];
      for (const id of candidates) {
        const detailResponse = await fetch(`/api/recipes/${id}`, {headers});
        if (!detailResponse.ok) {
          continue;
        }
        const detail = (await detailResponse.json()) as {
          ingredients?: Array<{name?: string}>;
        };
        const names = (detail.ingredients ?? [])
          .map(ingredient => ingredient.name)
          .filter((name): name is string => typeof name === 'string')
          .map(normalize)
          .sort();
        if (
          names.length === expected.length &&
          names.every((name, index) => name === expected[index])
        ) {
          blocking.push(id);
        }
      }
      return blocking;
    },
    {title, token, ingredientNames: expectedIngredientNames ?? null},
  );
  for (const id of ids) {
    await deleteRecipeViaApi(page, id);
  }
};

export const deleteMealPlanViaApi = async (
  page: Page,
  id: string,
): Promise<void> => apiDelete(page, `/meal-plans/${id}`);
