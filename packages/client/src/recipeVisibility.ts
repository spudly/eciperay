import type {RecipeVisibility} from '@eciperay/types';

export const isPublishedVisibility = (
  visibility: RecipeVisibility,
): boolean => {
  return visibility === 'unlisted' || visibility === 'public';
};

export const requiresPublishingConsent = (
  currentVisibility: RecipeVisibility,
  nextVisibility: RecipeVisibility,
): boolean => {
  return (
    currentVisibility === 'private' && isPublishedVisibility(nextVisibility)
  );
};

export const buildRecipePermalink = (
  baseUrl: string,
  recipe: {id: string; slug: string},
  shareToken?: string,
): string => {
  const url = new URL(`/recipe/${recipe.id}/${recipe.slug}`, baseUrl);
  if (shareToken) {
    url.searchParams.set('t', shareToken);
  }
  return url.toString();
};

type RecipeShareLinkInput = {
  id: string;
  slug: string;
  visibility: RecipeVisibility;
  sourceUrl?: string | null;
};

export const buildRecipeShareUrl = (
  baseUrl: string,
  recipe: RecipeShareLinkInput,
  shareToken?: string,
): string => {
  // A share link always points at the recipe on Eciperay (#534) — never
  // at the source the recipe was imported from. A supplied share token
  // rides on the permalink for any visibility: for private and unlisted
  // recipes it is what lets the recipient in through the public route.
  return buildRecipePermalink(baseUrl, recipe, shareToken);
};

export const recipeVisibilityLabels: Record<RecipeVisibility, string> = {
  private: 'Private',
  unlisted: 'Unlisted link',
  public: 'Public',
};

export const recipeVisibilityDescriptions: Record<RecipeVisibility, string> = {
  private: 'Just between you and your kitchen — only you can view this recipe.',
  unlisted: 'Anyone with the link can view it — no sign-in needed.',
  public: 'Out in the open — anyone can discover it, and it may turn up in search results.',
};
