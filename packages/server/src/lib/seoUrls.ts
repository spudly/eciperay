export const getWebAppBaseUrl = (): string =>
  process.env['WEB_APP_BASE_URL'] ?? 'https://www.eciperay.com';

export const buildPublicRecipeCanonicalUrl = (
  baseUrl: string,
  recipe: {id: string; slug: string},
): string => new URL(`/recipe/${recipe.id}/${recipe.slug}`, baseUrl).toString();
