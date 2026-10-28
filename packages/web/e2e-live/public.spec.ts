import {expect, test} from '@playwright/test';

/**
 * Signed-out and read-only live specs (issue #233). These run today, with no
 * test account: they only read from the QA dataset and exercise the real
 * Supabase auth wiring with a deliberately wrong password (which creates
 * nothing and touches no account).
 */
test.describe('live, signed out', () => {
  test('the landing page loads with no uncaught page errors', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(String(error)));

    await page.goto('/');

    await expect(page).toHaveTitle(/Eciperay/);
    expect(pageErrors).toEqual([]);
  });

  test('an authenticated route redirects to sign-in, which renders', async ({
    page,
  }) => {
    await page.goto('/recipes');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible();
  });

  test('a wrong password is rejected by the real auth backend', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('ci-nonexistent@example.invalid');
    await page.getByLabel('Password').fill('definitely-wrong-password');
    await page.getByRole('button', {name: 'Sign In'}).click();

    // Supabase answers and the form surfaces the failure; we stay on /login.
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the public Discover page renders against the QA dataset', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(String(error)));

    await page.goto('/discover');

    // The QA dataset's public recipes are data, not fixtures: assert the
    // page itself renders (its title and search chrome are always
    // present) rather than any particular recipe.
    await expect(
      page.getByRole('heading', {name: 'Discover recipes'}),
    ).toBeVisible({timeout: 15_000});
    await expect(page.getByPlaceholder('Search public recipes…')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
