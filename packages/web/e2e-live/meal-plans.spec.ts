import {expect, test} from '@playwright/test';

import {
  createRecipeViaUi,
  deleteMealPlanViaApi,
  deleteRecipeViaApi,
  type CreatedRecipe,
} from './flows.js';
import {QA_SKIP_REASON, hasQaAccount, uniqueCiName} from './qa.js';

/**
 * Meal plan flow (issue #233): create a plan containing a CI recipe, generate
 * its shopping list, and check an item off.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live meal plans', () => {
  let recipe: CreatedRecipe | null = null;
  let planId: string | null = null;

  test.afterEach(async ({page}) => {
    if (planId) {
      await deleteMealPlanViaApi(page, planId);
      planId = null;
    }
    if (recipe) {
      await deleteRecipeViaApi(page, recipe.id);
      recipe = null;
    }
  });

  test('create a plan, add the recipe, check off the shopping list', async ({
    page,
  }) => {
    recipe = await createRecipeViaUi(page, uniqueCiName('Planned'));
    const planTitle = uniqueCiName('Week Plan');

    await page.goto('/meal-plans/new');
    await page.getByPlaceholder('Plan title').fill(planTitle);
    // A one-week window starting tomorrow (the form takes YYYY-MM-DD).
    const day = 24 * 60 * 60 * 1000;
    const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);
    await page
      .getByPlaceholder('YYYY-MM-DD')
      .first()
      .fill(fmt(Date.now() + day));
    await page
      .getByPlaceholder('YYYY-MM-DD')
      .nth(1)
      .fill(fmt(Date.now() + 7 * day));
    // Include the CI recipe in the plan.
    await page.getByLabel(`Quantity · ${recipe.title}`).fill('1');
    await page.getByRole('button', {name: 'Save plan'}).click();

    await expect(page).toHaveURL(/\/meal-plans\/[^/]+$/, {timeout: 15_000});
    planId = page.url().split('/meal-plans/')[1]!;
    await expect(page.getByText(planTitle)).toBeVisible();
    await expect(page.getByText(recipe.title)).toBeVisible();

    // Shopping list: the recipe's ingredient appears and can be checked.
    await page.getByRole('button', {name: 'Shopping list'}).click();
    await expect(page).toHaveURL(/\/shopping-list$/);
    await expect(page.getByText('CI Test Ingredient')).toBeVisible({
      timeout: 15_000,
    });
    const checkbox = page.getByRole('checkbox').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});
