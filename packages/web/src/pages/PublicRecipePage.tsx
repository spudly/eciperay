/* eslint-disable max-lines -- public recipe host: every section's queries, mutations, and view-model mapping */
import {
  buildRecipePermalink,
  formatCommunityRatingLabel,
  formatScaledIngredientLine,
  invalidateRecipeQueries,
  isActiveScaleMultiplier,
  MOBILE_APP_INSTALL_URL,
  queryKeys,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
  sortIngredientsByOrder,
  useAuth,
  type RecipeScaleMultiplier,
} from '@eciperay/client';
import type {RecipeStarRating} from '@eciperay/types';
import {tagColorNameForHex} from '@spudly/ui';
import {
  PublicPageFrame,
  PublicRecipePage as PublicRecipePageView,
  type PublicRecipePageProps,
} from '@spudly/ui/pages';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {Navigate, useNavigate, useParams, useSearchParams} from 'react-router-dom';

import {RecipeCommentsSection} from '../components/recipe/RecipeCommentsSection.js';
import {RecipePageHead} from '../components/RecipePageHead.js';
import {eciperay} from '../lib/api.js';

/**
 * The public recipe route's host (B7 cluster 11): the design
 * system's PublicRecipePage renders the surface — a single scroll
 * holding the overview, ingredients, instructions, and engagement
 * sections (#169) — and this component keeps everything the page
 * must not own: the getPublic query and the slug-canonical
 * redirect, the document head (RecipePageHead), the clone and
 * rating mutations, and the per-section view-model mapping
 * (servings/scale selection, the missing-ingredient set and the
 * substitutions lookup it drives, the ratings view-model), which
 * mirrors the app detail host's mapping for RecipeDetailPage.
 * Every state of the page renders inside the DS PublicPageFrame.
 */

/**
 * The scale string the page shows as selected for a base/current
 * servings pair when the servings were not set through a scale
 * selection (copied from the app detail host): the preset's string
 * when the applied servings are exactly that preset's, otherwise
 * the exact servings ratio as a plain number string.
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

export const PublicRecipePage = () => {
  const {id = '', slug = ''} = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('t') ?? undefined;
  const navigate = useNavigate();
  const {session} = useAuth();
  const queryClient = useQueryClient();

  const {data, isLoading, error} = useQuery({
    queryKey: queryKeys.publicRecipe(id, slug, shareToken),
    queryFn: () => eciperay.recipes.getPublic(id, {slug, shareToken}),
    enabled: id.length > 0 && slug.length > 0,
    retry: false,
  });

  const recipe = data?.recipe;

  // Ratings (the old RecipeRatingsSection, in its public context):
  // the community rating is display data; the viewer's star input
  // is controlled, with the put/delete mutation behind the change
  // callback and the public query invalidated on success.
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

  // Clone (the old PublicRecipeCtas): signed in, the mutation runs
  // and lands on the saved copy; signed out, the CTA navigates to
  // sign-up carrying the clone target instead (see onClonePress).
  const cloneMutation = useMutation({
    mutationFn: () => eciperay.recipes.clone(id, {shareToken}),
    onSuccess: data => {
      void invalidateRecipeQueries(queryClient, data.id, data.versionId);
      void navigate(`/recipes/${data.id}`);
    },
  });

  // Servings and scale selection (the old IngredientsTab's state,
  // on the app host's model): the selection records the page's raw
  // scale value alongside the servings it applies; when the
  // servings moved without a selection behind them, the value
  // re-derives from the servings that actually apply.
  const [servings, setServings] = useState<number | null>(null);
  const [scaleSelection, setScaleSelection] = useState<{
    baseServings: number;
    servings: number;
    value: string;
  } | null>(null);

  // Ingredients: the missing set and the substitutions lookup it
  // drives stay host-side; rows are view-modeled with their
  // missing flags.
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
  const missingNames =
    recipe?.ingredients
      .filter(ingredient => missingIds.has(ingredient.id))
      .map(ingredient => ingredient.name) ?? [];
  const {data: substitutions = [], isFetching: isLoadingSubstitutions} =
    useQuery({
      queryKey: [...queryKeys.recipe(id), 'substitutions', missingNames],
      queryFn: () => eciperay.ai.substitutions(id, missingNames),
      // The substitutions endpoint requires an account (requireAuth
      // + entitlement server-side): a signed-out visitor can still
      // mark ingredients missing, but the lookup stays off rather
      // than firing a request that can only 401 — the visible
      // outcome matches the old tab (no substitutions shown), minus
      // the failed request.
      enabled: missingNames.length > 0 && Boolean(session),
    });

  const frame = (props: PublicRecipePageProps) => (
    <PublicPageFrame
      brandHref="/"
      signInHref="/login"
      privacyHref="/privacy"
      termsHref="/terms"
    >
      <PublicRecipePageView {...props} />
    </PublicPageFrame>
  );

  if (!id || !slug) {
    return frame({state: 'notFound'});
  }

  if (data?.slugMismatch && data.canonicalSlug !== slug) {
    const nextParams = new URLSearchParams(searchParams);
    const query = nextParams.toString();
    return (
      <Navigate
        to={`/recipe/${id}/${data.canonicalSlug}${query ? `?${query}` : ''}`}
        replace
      />
    );
  }

  if (isLoading) {
    return frame({state: 'loading'});
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.toLowerCase().includes('denied')) {
      return frame({state: 'unavailable'});
    }
    return frame({state: 'notFound'});
  }

  if (!data || !recipe) {
    return frame({state: 'notFound'});
  }

  const baseServings = recipe.servings;
  const currentServings = servings ?? baseServings;
  const scaleFactor = currentServings / baseServings;
  const scaleValue =
    scaleSelection &&
    scaleSelection.baseServings === baseServings &&
    scaleSelection.servings === currentServings
      ? scaleSelection.value
      : deriveScaleValue(baseServings, currentServings);
  const canonicalUrl = buildRecipePermalink(window.location.origin, {
    id: recipe.id,
    slug: data.canonicalSlug,
  });

  const communityRating = data.communityRating;
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
          value: data.viewerRating,
          isStale: data.viewerRatingIsStale,
          isPending: ratingMutation.isPending,
        }
      : null,
  };

  return (
    <>
      <RecipePageHead
        recipe={recipe}
        canonicalUrl={canonicalUrl}
        communityRating={data.communityRating}
      />
      {frame({
        state: 'ready',
        overview: {
          imageUrl: recipe.imageUrl,
          title: recipe.title,
          description: recipe.description,
          status: recipe.status,
          servingsLabel: String(currentServings),
          ...(recipe.prepTimeMin
            ? {prepTimeLabel: `${recipe.prepTimeMin}m`}
            : {}),
          ...(recipe.cookTimeMin
            ? {cookTimeLabel: `${recipe.cookTimeMin}m`}
            : {}),
          tags: recipe.tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tagColorNameForHex(tag.color),
          })),
        },
        ctas: session
          ? {variant: 'signedIn', isClonePending: cloneMutation.isPending}
          : {variant: 'signedOut'},
        onSignUpPress: () => {
          void navigate('/signup');
        },
        onClonePress: () => {
          if (session) {
            cloneMutation.mutate();
          } else {
            void navigate(
              `/signup?cloneRecipe=${encodeURIComponent(recipe.id)}`,
            );
          }
        },
        onGetAppPress: () => {
          window.location.assign(MOBILE_APP_INSTALL_URL);
        },
        ingredients: {
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
          isLoadingSubstitutions,
          substitutions: substitutions.map(substitution => ({
            ingredient: substitution.ingredient,
            suggestions: substitution.suggestions.join(', '),
          })),
        },
        instructions: {
          instructions: recipe.instructions.map(instruction => ({
            id: instruction.id,
            stepNumber: instruction.stepNumber,
            body: instruction.body,
          })),
        },
        ratings,
        onViewerRatingChange: (stars: number | null) => {
          ratingMutation.mutate(stars as RecipeStarRating | null);
        },
        renderComments: () => (
          <RecipeCommentsSection
            recipeId={recipe.id}
            shareToken={shareToken}
            publicList
          />
        ),
      })}
    </>
  );
};
