import {formatCommunityRatingLabel} from '@eciperay/client/recipeEngagement';
import {
  formatScaledIngredientLine,
  sortIngredientsByOrder,
} from '@eciperay/client/recipeScaling';
import type {PublicRecipeResponse} from '@eciperay/types';
import {tagColorNameForHex, type PublicRecipePageProps} from '@spudly/ui';

/**
 * SSR view-model for the public recipe page (#304 Phase 0 spike).
 *
 * Maps the loader's `PublicRecipeResponse` (see loadPublicRecipe.ts) to the
 * design system's PublicRecipePage props for the anonymous, first-paint render:
 * signed-out CTAs, base servings at the 1x scale preset, no viewer rating, and
 * no comments slot (comments keep their own client-side query and hydrate after
 * first paint). The mapping mirrors the web host's ready-state mapping
 * (packages/web/src/pages/PublicRecipePage.tsx) so the server HTML and the
 * hydrated page agree.
 */

// The web host's shared footer data (legalDocumentData.ts), mirrored
// here because the footer content is app-owned data the DS renders
// verbatim; the server cannot import from the web package.
const publicRecipeFooter: NonNullable<PublicRecipePageProps['footer']> = {
  brand: {label: 'Eciperay', href: '/'},
  columns: [
    {
      title: 'Legal',
      links: [
        {label: 'Privacy Policy', href: '/privacy'},
        {label: 'Terms of Service', href: '/terms'},
        {
          label: 'Do Not Sell or Share My Personal Information',
          href: '/privacy/consent',
        },
      ],
    },
  ],
  storeLinks: [],
  socialLinks: [],
};

// Intent callbacks are inert in server HTML: the hydrated web host
// re-renders the page with the live callbacks on mount.
const noop = () => {};

export const buildPublicRecipePageProps = (
  body: PublicRecipeResponse,
): PublicRecipePageProps => {
  const {recipe, communityRating} = body;

  return {
    state: 'ready',
    footer: publicRecipeFooter,
    overview: {
      imageUrl: recipe.imageUrl,
      title: recipe.title,
      description: recipe.description,
      status: recipe.status,
      servingsLabel: String(recipe.servings),
      ...(recipe.prepTimeMin ? {prepTimeLabel: `${recipe.prepTimeMin}m`} : {}),
      ...(recipe.cookTimeMin ? {cookTimeLabel: `${recipe.cookTimeMin}m`} : {}),
      tags: recipe.tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tagColorNameForHex(tag.color),
      })),
    },
    ctas: {variant: 'signedOut'},
    onSignUpPress: noop,
    onClonePress: noop,
    onGetAppPress: noop,
    ingredients: {
      servings: recipe.servings,
      onServingsChange: noop,
      // SSR renders the base servings, so the 1x preset is the active
      // scale by construction (the web host derives the same value).
      scaleValue: '1',
      onScaleChange: noop,
      ingredients: sortIngredientsByOrder(recipe.ingredients).map(
        ingredient => ({
          id: ingredient.id,
          label: formatScaledIngredientLine(ingredient, 1),
          isOptional: ingredient.isOptional,
          isMissing: false,
        }),
      ),
      onIngredientPress: noop,
      loadingSubstitutions: false,
      substitutions: [],
    },
    instructions: {
      instructions: recipe.instructions.map(instruction => ({
        id: instruction.id,
        stepNumber: instruction.stepNumber,
        body: instruction.body,
      })),
    },
    ratings: {
      community: communityRating
        ? {
            stars: '★'.repeat(Math.round(communityRating.average)),
            label: formatCommunityRatingLabel(
              communityRating.average,
              communityRating.count,
            ),
            hasStaleRatings: communityRating.hasStaleRatings,
          }
        : null,
      viewer: null,
    },
    onViewerRatingChange: noop,
  };
};
