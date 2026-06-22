import {buildRecipePageTitle, RECIPE_SEO_SITE_NAME} from '@eciperay/client';
import {waitFor} from '@testing-library/react';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipePageHead} from './RecipePageHead.js';

describe('RecipePageHead', () => {
  test('sets document title, meta tags, canonical link, and JSON-LD', async () => {
    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'SEO Pasta',
      description: 'A public pasta recipe.',
      imageUrl: 'https://cdn.example/pasta.jpg',
      visibility: 'public',
    });
    void _userId;

    await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r1/seo-pasta"
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(document.title).toBe(buildRecipePageTitle('SEO Pasta'));
    });
    expect(
      document.head.querySelector('meta[name="description"]'),
    ).toHaveAttribute(
      'content',
      expect.stringContaining('public pasta recipe'),
    );
    expect(
      document.head.querySelector('meta[property="og:title"]'),
    ).toHaveAttribute('content', buildRecipePageTitle('SEO Pasta'));
    expect(
      document.head.querySelector('meta[property="og:image"]'),
    ).toHaveAttribute('content', 'https://cdn.example/pasta.jpg');
    expect(
      document.head.querySelector('link[rel="canonical"]'),
    ).toHaveAttribute('href', 'https://www.eciperay.com/recipe/r1/seo-pasta');
    const jsonLd = document.head.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(jsonLd?.textContent).toContain('"@type":"Recipe"');
    expect(jsonLd?.textContent).toContain('SEO Pasta');
  });

  test('uses summary twitter card when recipe has no image', async () => {
    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'Plain Salad',
      imageUrl: null,
      visibility: 'public',
    });
    void _userId;

    await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r2/plain-salad"
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(
        document.head.querySelector('meta[name="twitter:card"]'),
      ).toHaveAttribute('content', 'summary');
    });
    expect(
      document.head.querySelector('meta[name="twitter:image"]'),
    ).toBeNull();
  });

  test('includes aggregateRating in JSON-LD when provided', async () => {
    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'Rated Soup',
      visibility: 'public',
    });
    void _userId;

    await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r3/rated-soup"
        communityRating={{average: 4.2, count: 8}}
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(
        document.head.querySelector('script[type="application/ld+json"]'),
      ).toBeTruthy();
    });
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
        ?.textContent,
    ).toContain('AggregateRating');
  });

  test('reuses existing meta and canonical nodes in the document head', async () => {
    const description = document.createElement('meta');
    description.setAttribute('name', 'description');
    description.content = 'Old description';
    document.head.appendChild(description);

    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://old.example/recipe';
    document.head.appendChild(canonical);

    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'Reused Tags',
      visibility: 'public',
    });
    void _userId;

    await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r5/reused-tags"
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(description.content).toContain('test recipe');
    });
    expect(canonical.href).toBe(
      'https://www.eciperay.com/recipe/r5/reused-tags',
    );
    expect(
      document.head.querySelectorAll('meta[name="description"]'),
    ).toHaveLength(1);
  });

  test('updates existing head tags when props change', async () => {
    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'First Title',
      visibility: 'public',
    });
    void _userId;

    const {rerender} = await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r1/first-title"
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(document.title).toBe(buildRecipePageTitle('First Title'));
    });

    rerender(
      <RecipePageHead
        recipe={{...recipe, title: 'Second Title'}}
        canonicalUrl="https://www.eciperay.com/recipe/r1/second-title"
      />,
    );

    await waitFor(() => {
      expect(document.title).toBe(buildRecipePageTitle('Second Title'));
    });
    expect(
      document.head.querySelectorAll('meta[name="description"]'),
    ).toHaveLength(1);
    expect(
      document.head.querySelector('link[rel="canonical"]'),
    ).toHaveAttribute(
      'href',
      'https://www.eciperay.com/recipe/r1/second-title',
    );
  });

  test('restores the previous document title on unmount', async () => {
    document.title = `Previous | ${RECIPE_SEO_SITE_NAME}`;
    const {userId: _userId, ...recipe} = makeRecipeDetail({
      title: 'Temporary',
      visibility: 'public',
    });
    void _userId;

    const {unmount} = await renderWithProviders(
      <RecipePageHead
        recipe={recipe}
        canonicalUrl="https://www.eciperay.com/recipe/r4/temporary"
      />,
      {withAuth: false},
    );

    await waitFor(() => {
      expect(document.title).toBe(buildRecipePageTitle('Temporary'));
    });
    unmount();
    expect(document.title).toBe(`Previous | ${RECIPE_SEO_SITE_NAME}`);
  });
});
