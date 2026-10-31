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
    recipe = await createRecipeViaUi(page, uniqueCiName('Planned'), value => {
      recipe = value;
    });
    const planTitle = uniqueCiName('Week Plan');

    await page.goto('/meal-plans/new');
    await page.getByPlaceholder('Plan title').fill(planTitle);
    // Set a one-week dated window (today through +7 days). Dated plans
    // are covered again now that issue #251 is fixed: it made dated
    // plan create/edit/detail 500 server-side, so this spec previously
    // had to leave the dates unset to pass.
    const toDateOnly = (date: Date) =>
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
    const startsOn = new Date();
    const endsOn = new Date(startsOn);
    endsOn.setDate(endsOn.getDate() + 7);
    await page.getByLabel('Starts on').fill(toDateOnly(startsOn));
    await page.getByLabel('Ends on').fill(toDateOnly(endsOn));
    // Include the CI recipe in the plan: checking its checkbox reveals
    // its quantity/servings steppers (Save plan stays disabled until
    // at least one recipe is checked). Quantity is a stepper, not a
    // text field, and it already defaults to 1 — what this spec wants.
    await page
      .getByRole('checkbox', {name: `Recipe · ${recipe.title}`})
      .check();
    await expect(page.getByText(`Quantity · ${recipe.title}`)).toBeVisible();
    await page.getByRole('button', {name: 'Save plan'}).click();

    // Plan ids are UUIDs — matching the bare segment would also match
    // /meal-plans/new, which masked a failed save in earlier rounds.
    await expect(page).toHaveURL(/\/meal-plans\/[0-9a-f-]{36}$/, {
      timeout: 15_000,
    });
    planId = page.url().split('/meal-plans/')[1]!;
    await expect(page.getByText(planTitle)).toBeVisible();
    // The recipe title renders in several places on the detail page
    // (entry row, nutrition, shopping preview) — one visible match is
    // enough to prove the recipe is on the plan.
    await expect(page.getByText(recipe.title).first()).toBeVisible();

    // Shopping list: the recipe's ingredient appears and can be checked.
    // The DS detail page renders the action in its href form (#248), so
    // it is a link, not a button.
    await page.getByRole('link', {name: 'Shopping list'}).click();
    await expect(page).toHaveURL(/\/shopping-list$/);
    await expect(page.getByText('CI Test Ingredient')).toBeVisible({
      timeout: 15_000,
    });
    // Target the checkbox on the ingredient's own row: the list is
    // generated from a persistent dataset, so "the first checkbox" is
    // not a stable identity for this item.
    const checkbox = page
      .getByRole('listitem')
      .filter({hasText: 'CI Test Ingredient'})
      .getByRole('checkbox');
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});
