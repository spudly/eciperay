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
  if (recipe.sourceUrl) {
    return recipe.sourceUrl;
  }

  if (recipe.visibility === 'private') {
    return `${baseUrl.replace(/\/$/, '')}/recipes/${recipe.id}`;
  }

  return buildRecipePermalink(
    baseUrl,
    recipe,
    recipe.visibility === 'unlisted' ? shareToken : undefined,
  );
};

export const recipeVisibilityLabels: Record<RecipeVisibility, string> = {
  private: 'Private',
  unlisted: 'Unlisted link',
  public: 'Public',
};

export const recipeVisibilityDescriptions: Record<RecipeVisibility, string> = {
  private: 'Only you can view this recipe.',
  unlisted: 'Anyone with the link can view without signing in.',
  public: 'Discoverable by anyone and may appear in search results.',
};
