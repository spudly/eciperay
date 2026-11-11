import {
  buildAuthenticatedPageHead,
  buildCanonicalUrl,
  buildPublicPageHead,
  buildPublicRecipeHead,
  DEFAULT_WEB_BASE_URL,
  STATIC_PUBLIC_PAGES,
} from './pageHead.js';
import {makeRecipeDetail} from './test/fixtures/recipe.js';

describe('pageHead', () => {
  test('builds canonical URLs from the shared builder', () => {
    expect(buildCanonicalUrl(DEFAULT_WEB_BASE_URL, '/discover')).toBe(
      'https://www.eciperay.com/discover',
    );
    expect(buildCanonicalUrl(DEFAULT_WEB_BASE_URL, '/')).toBe(
      'https://www.eciperay.com/',
    );
  });

  test('public static pages get full social head config and index robots', () => {
    for (const page of STATIC_PUBLIC_PAGES) {
      const head = buildPublicPageHead(DEFAULT_WEB_BASE_URL, page.path);
      expect(head).toBeDefined();
      expect(head?.robots).toBe('index, follow');
      expect(head?.title).toContain('Eciperay');
      expect(head?.description).toBeTruthy();
      expect(head?.canonicalUrl).toBe(
        `https://www.eciperay.com${page.path === '/' ? '/' : page.path}`,
      );
      expect(head?.openGraph?.url).toBe(head?.canonicalUrl);
      expect(head?.openGraph?.type).toBe('website');
      expect(head?.twitter?.title).toBe(head?.title);
      // No fabricated share image for pages without one.
      expect(head?.openGraph?.imageUrl).toBeUndefined();
      expect(head?.twitter?.imageUrl).toBeUndefined();
    }
  });

  test('unknown paths have no public head config', () => {
    expect(
      buildPublicPageHead(DEFAULT_WEB_BASE_URL, '/recipes'),
    ).toBeUndefined();
  });

  test('public recipe head carries social cards and the recipe image', () => {
    const {userId: _userId, ...detail} = makeRecipeDetail({
      title: 'Public Pasta',
      description: 'A tasty pasta dish.',
      imageUrl: 'https://cdn.example/pasta.jpg',
      visibility: 'public',
    });
    const recipe = {...detail, authorDisplayName: null};
    const head = buildPublicRecipeHead(
      recipe,
      'https://www.eciperay.com/recipe/r1/public-pasta',
    );
    expect(head.title).toBe('Public Pasta | Eciperay');
    expect(head.robots).toBe('index, follow');
    expect(head.openGraph?.type).toBe('article');
    expect(head.openGraph?.imageUrl).toBe('https://cdn.example/pasta.jpg');
    expect(head.twitter?.card).toBe('summary_large_image');
    expect(head.twitter?.imageUrl).toBe('https://cdn.example/pasta.jpg');
  });

  test('public recipe head omits og:image when the recipe has no image', () => {
    const {userId: _userId, ...detail} = makeRecipeDetail({
      title: 'Plain Salad',
      imageUrl: null,
      visibility: 'public',
    });
    const recipe = {...detail, authorDisplayName: null};
    const head = buildPublicRecipeHead(
      recipe,
      'https://www.eciperay.com/recipe/r2/plain-salad',
    );
    expect(head.openGraph?.imageUrl).toBeUndefined();
    expect(head.twitter?.card).toBe('summary');
    expect(head.twitter?.imageUrl).toBeUndefined();
  });

  test('authenticated pages get a title and noindex, with no social cards', () => {
    const head = buildAuthenticatedPageHead('Recipes');
    expect(head.title).toBe('Recipes | Eciperay');
    expect(head.robots).toBe('noindex, nofollow');
    expect(head.description).toBeUndefined();
    expect(head.canonicalUrl).toBeUndefined();
    expect(head.openGraph).toBeUndefined();
    expect(head.twitter).toBeUndefined();
  });
});
