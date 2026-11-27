/* eslint-disable max-lines -- guest recipe host: every section's queries, mutations, and view-model mapping */
import {
  buildRecipePath,
  formatCommunityRatingLabel,
  formatScaledIngredientLine,
  invalidateRecipeQueries,
  isActiveScaleMultiplier,
  MOBILE_APP_INSTALL_URL,
  queryKeys,
  RECIPE_SCALE_MULTIPLIERS,
  resizedImageUrl,
  servingsForMultiplier,
  sortIngredientsByOrder,
  useAuth,
  useRecipeCommentsProps,
  type RecipeScaleMultiplier,
} from '@eciperay/client';
import type {
  RecipeCommunityRating,
  RecipeDetail,
  RecipeStarRating,
} from '@eciperay/types';
import {tagColorNameForHex} from '@spudly/ui';
import {RecipeDetailPage} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

/**
 * The unified recipe page's guest host (#649 tranche 2): the design
 * system's RecipeDetailPage in its guest form — a single scroll holding
 * the overview, ingredients, instructions, and engagement sections —
 * for every viewer who is not the recipe's owner: a signed-in non-owner
 * (public recipe or one shared with them) gets the signed-in treatment
 * (save-a-copy clone, ratings, comments where access allows), and a
 * signed-out visitor gets the same rendering with the sign-in CTA bar
 * and no actions. This component keeps everything the DS page must not
 * own: the clone and rating mutations, and the per-section view-model
 * mapping (servings/scale selection, the missing-ingredient set and the
 * substitutions lookup it drives, the ratings view-model). It was the
 * ready-state half of the retired PublicRecipePage host; the unified
 * RecipeDetailPage now owns the fetching, the slug-canonical redirect,
 * the document head, and the loading / notFound / unavailable states
 * for both recipe routes.
 */

export type GuestRecipe = Pick<
  RecipeDetail,
  | 'id'
  | 'title'
  | 'description'
  | 'servings'
  | 'prepTimeMin'
  | 'cookTimeMin'
  | 'imageUrl'
  | 'tags'
  | 'ingredients'
  | 'instructions'
>;

type RecipeGuestHostProps = {
  recipe: GuestRecipe;
  communityRating?: RecipeCommunityRating | null;
  viewerRating?: RecipeStarRating | null;
  viewerRatingIsStale?: boolean;
  shareToken?: string;
  /** The route's slug segment, for the public query's cache key. */
  slug?: string;
  /**
   * Comments cross through the public comments endpoint (the public
   * route's mode, carrying the share token) when set; on the app route
   * a signed-in non-owner's comments use the authenticated endpoint.
   */
  publicList?: boolean;
};

/**
 * The scale string the page shows as selected for a base/current servings
 * pair when the servings were not set through a scale selection (copied
 * from the app detail host): the preset's string when the applied
 * servings are exactly that preset's, otherwise the exact servings ratio
 * as a plain number string.
 */
const deriveScaleValue = (
  baseServings: number,
  currentServings: number,
): string => {
  const preset = RECIPE_SCALE_MULTIPLIERS.find(multiplier =>
    isActiveScaleMultiplier(baseServings, currentServings, multiplier),
  );
  return preset === undefined
    ? String(currentServings / baseServings)
    : String(preset);
};

export const RecipeGuestHost = ({
  recipe,
  communityRating,
  viewerRating,
  viewerRatingIsStale = false,
  shareToken,
  slug,
  publicList = false,
}: RecipeGuestHostProps) => {
  const navigate = useNavigate();
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const id = recipe.id;

  // Comments: the section's query, drafts, and mutations live in
  // useRecipeCommentsProps; on the public route it runs in its
  // public-list mode, on the app route in its authenticated mode.
  // No ownerUserId either way: delete eligibility stays author-only,
  // as the retired public page behaved.
  const commentsProps = useRecipeCommentsProps(eciperay, {
    recipeId: id,
    shareToken,
    publicList,
    surfaceMutationErrors: true,
  });

  // Ratings: the community rating is display data; the viewer's star
  // input is controlled, with the put/delete mutation behind the change
  // callback and the recipe queries invalidated on success.
  const ratingMutation = useMutation({
    mutationFn: async (stars: RecipeStarRating | null) => {
      if (stars === null) {
        return eciperay.recipes.deleteRating(id);
      }
      return eciperay.recipes.putRating(id, {stars});
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKeys.recipe(id), data);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicRecipe(id, slug, shareToken),
      });
    },
  });

  // Clone: signed in, the mutation runs and lands on the saved copy;
  // signed out, the CTA navigates to sign-up carrying the clone target
  // instead (see onClonePress).
  const cloneMutation = useMutation({
    mutationFn: () => eciperay.recipes.clone(id, {shareToken}),
    onSuccess: data => {
      void invalidateRecipeQueries(queryClient, data.id, data.versionId);
      void navigate(buildRecipePath(data));
    },
  });

  // Servings and scale selection: the selection records the page's raw
  // scale value alongside the servings it applies; when the servings
  // moved without a selection behind them, the value re-derives from
  // the servings that actually apply.
  const [servings, setServings] = useState<number | null>(null);
  const [scaleSelection, setScaleSelection] = useState<{
    baseServings: number;
    servings: number;
    value: string;
  } | null>(null);

  // Ingredients: the missing set and the substitutions lookup it drives
  // stay host-side; rows are view-modeled with their missing flags.
  const [missingIds, setMissingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const toggleMissing = (ingredientId: string) => {
    setMissingIds(current => {
      const next = new Set(current);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };
  const missingNames = recipe.ingredients
    .filter(ingredient => missingIds.has(ingredient.id))
    .map(ingredient => ingredient.name);
  const {data: substitutions = [], isFetching: isLoadingSubstitutions} =
    useQuery({
      queryKey: [...queryKeys.recipe(id), 'substitutions', missingNames],
      queryFn: () => eciperay.ai.substitutions(id, missingNames),
      // The substitutions endpoint requires an account: a signed-out
      // visitor can still mark ingredients missing, but the lookup
      // stays off rather than firing a request that can only 401.
      enabled: missingNames.length > 0 && Boolean(session),
    });

  const baseServings = recipe.servings;
  const currentServings = servings ?? baseServings;
  const scaleFactor = currentServings / baseServings;
  const scaleValue =
    scaleSelection &&
    scaleSelection.baseServings === baseServings &&
    scaleSelection.servings === currentServings
      ? scaleSelection.value
      : deriveScaleValue(baseServings, currentServings);

  const ratings = {
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
    viewer: session
      ? {
          value: viewerRating ?? null,
          isStale: viewerRatingIsStale,
          isPending: ratingMutation.isPending,
        }
      : null,
  };

  return (
    <RecipeDetailPage
      state="ready"
      viewer={session ? 'signedIn' : 'signedOut'}
      overview={{
        imageUrl: resizedImageUrl(recipe.imageUrl, 1200),
        title: recipe.title,
        description: recipe.description,
        servingsLabel: String(currentServings),
        ...(recipe.prepTimeMin ? {prepTimeLabel: `${recipe.prepTimeMin}m`} : {}),
        ...(recipe.cookTimeMin ? {cookTimeLabel: `${recipe.cookTimeMin}m`} : {}),
        tags: recipe.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tagColorNameForHex(tag.color),
        })),
      }}
      ctas={
        session
          ? {variant: 'signedIn', isClonePending: cloneMutation.isPending}
          : {variant: 'signedOut'}
      }
      onSignUpPress={() => {
        void navigate('/signup');
      }}
      onClonePress={() => {
        if (session) {
          cloneMutation.mutate();
        } else {
          void navigate(`/signup?cloneRecipe=${encodeURIComponent(id)}`);
        }
      }}
      onGetAppPress={() => {
        window.location.assign(MOBILE_APP_INSTALL_URL);
      }}
      ingredients={{
        servings: currentServings,
        onServingsChange: (nextServings: number) => {
          setScaleSelection({
            baseServings,
            servings: nextServings,
            value: deriveScaleValue(baseServings, nextServings),
          });
          setServings(nextServings);
        },
        scaleValue,
        onScaleChange: (value: string) => {
          const nextServings = servingsForMultiplier(
            baseServings,
            Number(value) as RecipeScaleMultiplier,
          );
          setScaleSelection({baseServings, servings: nextServings, value});
          setServings(nextServings);
        },
        ingredients: sortIngredientsByOrder(recipe.ingredients).map(
          ingredient => ({
            id: ingredient.id,
            label: formatScaledIngredientLine(ingredient, scaleFactor),
            isOptional: ingredient.isOptional,
            isMissing: missingIds.has(ingredient.id),
          }),
        ),
        onIngredientPress: toggleMissing,
        loadingSubstitutions: isLoadingSubstitutions,
        substitutions: substitutions.map(substitution => ({
          ingredient: substitution.ingredient,
          suggestions: substitution.suggestions.join(', '),
        })),
      }}
      instructions={{
        instructions: recipe.instructions.map(instruction => ({
          id: instruction.id,
          stepNumber: instruction.stepNumber,
          body: instruction.body,
        })),
      }}
      ratings={ratings}
      onViewerRatingChange={(stars: number | null) => {
        ratingMutation.mutate(stars as RecipeStarRating | null);
      }}
      comments={commentsProps}
    />
  );
};
