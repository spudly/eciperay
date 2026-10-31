import {expect, test} from '@playwright/test';

import {publicRecipeSummary} from './fixtures.js';
import {installMocks} from './mockApi.js';

test.describe('signed out', () => {
  test('an authenticated route redirects to sign-in, which renders', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/recipes');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the public Discover browse page renders recipe cards', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/discover');

    await expect(page.getByText('E2E Public Pancakes')).toBeVisible();
    await expect(page.getByText(/By E2E Chef/)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the privacy policy renders in full inside the public frame', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/privacy');

    await expect(
      page.getByRole('heading', {name: 'Privacy Policy'}),
    ).toBeVisible();
    await expect(
      page.getByText('Last updated: July 22, 2026', {exact: true}),
    ).toBeVisible();
    // The final section renders (the document is data-driven now;
    // this pins that every section crosses, including the last) —
    // lead-in and the contact email link it carries.
    await expect(page.getByText('Questions about this Privacy Policy?')).toBeVisible();
    await expect(
      // The contact email recurs in earlier sections (Deletion,
      // Analytics); the last one is this section's.
      page.getByRole('link', {name: 'shuoink+eciperaylegal@gmail.com'}).last(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {name: 'Terms of Service'}),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the terms of service render in full inside the public frame', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/terms');

    await expect(
      page.getByRole('heading', {name: 'Terms of Service'}),
    ).toBeVisible();
    await expect(
      page.getByText('Last updated: June 18, 2026', {exact: true}),
    ).toBeVisible();
    await expect(page.getByText('Questions about these Terms?')).toBeVisible();
    await expect(
      // The contact email also appears under Termination; the last
      // one is this section's.
      page.getByRole('link', {name: 'shuoink+eciperaylegal@gmail.com'}).last(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {name: 'Privacy Policy'}),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('scrolling Discover to the end loads the next page', async ({page}) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    // 21 public recipes: one full page of 20 plus a single-recipe
    // second page. The endpoint honors offset/limit like the real
    // API; the route replaces the default mock for this path.
    const recipes = Array.from({length: 21}, (_, index) => ({
      ...publicRecipeSummary,
      id: `e2e-discover-${index}`,
      slug: `e2e-discover-${index}`,
      title: `E2E Discover Recipe ${index}`,
    }));
    await page.route('**/api/public/recipes**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/public/recipes') {
        await route.fallback();
        return;
      }
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(recipes.slice(offset, offset + limit)),
      });
    });

    await page.goto('/discover');
    await expect(page.getByText('E2E Discover Recipe 0')).toBeVisible();
    await expect(page.getByText('E2E Discover Recipe 20')).toHaveCount(0);

    // The design-system page loads more from its list's end-reached
    // signal: keep scrolling the list until the second page renders.
    await page.mouse.move(400, 300);
    await expect(async () => {
      await page.mouse.wheel(0, 2400);
      await expect(page.getByText('E2E Discover Recipe 20')).toBeVisible({
        timeout: 1000,
      });
    }).toPass({timeout: 30_000});
    expect(pageErrors).toEqual([]);
  });
});
