/**
 * Layout geometry for the recipe image preview (plain objects — no StyleSheet;
 * the values are dimensions, not theme styling). Shared by RecipeImageField and
 * OverviewTab.
 */
const RECIPE_IMAGE_PREVIEW_HEIGHT = 256;

export const recipeImagePreviewStyles = {
  frame: {height: RECIPE_IMAGE_PREVIEW_HEIGHT, width: '100%'} as const,
  image: {width: '100%', height: '100%'} as const,
  placeholder: {
    height: RECIPE_IMAGE_PREVIEW_HEIGHT,
    justifyContent: 'center',
  } as const,
};
