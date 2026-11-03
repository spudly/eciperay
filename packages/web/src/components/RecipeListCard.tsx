import {
  formatRecipeListSubtitle,
  invalidateRecipeQueries,
  makeRecipeDetail,
  type ShowcaseFrameProps,
} from '@eciperay/client';
import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {RatingForm, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState, type ComponentType, type CSSProperties} from 'react';

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency; the design
// system Button has no gray-filled or danger-tint variant for these
// in-card actions, so the trailing slot keeps plain buttons).
const cardActionStyle: CSSProperties = {
  borderRadius: 8,
  border: 'none',
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 4,
  paddingBottom: 4,
  fontSize: 14,
  fontFamily: tokens.typography.fontFamily.sans,
  cursor: 'pointer',
};

import {eciperay} from '../lib/api.js';

import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

// Parity note (#278): the card subtitle is formatted by the shared
// formatRecipeListSubtitle in @eciperay/client — the per-mirror local
// copies are gone, so the servings pluralization and satiety label are
// defined once for both mirrors and the app's DS-page hosts.
// Parity note (design-system#126): both mirrors import the
// design system's rating form — the app mirror adopted it with the
// design-system pages, and this mirror adopted it in B7 cluster C6
// (design-system#130), when the web home list retired into the
// design system HomePage. The form shipped as CookLogForm until
// @spudly/ui 1.15.0 generalized it into RatingForm
// (design-system#176): the submit view-model's `rating` maps onto
// the cook log's authorStarRating at this boundary. Web's local
// cooking/CookLogForm still serves the recipe detail cook-history
// tab until cluster C7.

type RecipeListCardProps = {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
  onPress?: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const RecipeListCard = ({
  recipe,
  onDelete,
  onPress,
  isDeleting = false,
  deleteError,
}: RecipeListCardProps) => {
  const [showForm, setShowForm] = useState(false);
  // Deletion is confirmed in-page, not with window.confirm (#263): the
  // native dialog is suppressed in some browsers/webviews, which made
  // Delete a silent no-op — the click never reached onDelete and no
  // error was shown. Meal, meal-plan, and tag deletes never had that
  // gate. The two-step inline confirm mirrors the app's destructive
  // Alert (Cancel / Delete) while staying renderable everywhere.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      setShowForm(false);
    },
  });

  return (
    <div>
      <ThumbnailListCard
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        subtitle={formatRecipeListSubtitle(recipe)}
        onPress={onPress}
        linkTo={onPress ? undefined : `/recipes/${recipe.id}`}
        trailing={
          <div
            style={{
              marginLeft: tokens.spacing[3],
              display: 'flex',
              flexShrink: 0,
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            {showForm ? null : confirmingDelete ? (
              <>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.danger.danger7,
                    color: '#ffffff',
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                  disabled={isDeleting}
                  onClick={() => {
                    onDelete(recipe.id);
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.gray.gray2,
                    color: tokens.colors.gray.gray8,
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                  disabled={isDeleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.gray.gray2,
                    color: tokens.colors.gray.gray8,
                  }}
                  onClick={() => {
                    setShowForm(true);
                  }}
                >
                  Log cook
                </button>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.danger.danger1,
                    color: tokens.colors.danger.danger7,
                  }}
                  onClick={() => {
                    setConfirmingDelete(true);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        }
      />
      {deleteError ? (
        <p
          role="alert"
          style={{
            margin: 0,
            marginBottom: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.danger.danger7,
          }}
        >
          {deleteError}
        </p>
      ) : null}
      {showForm ? (
        <div style={{marginBottom: tokens.spacing[3]}}>
          <RatingForm
            variant="light"
            notesPlaceholder="Notes from this cook (optional)"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={values => {
              createMutation.mutate({
                authorStarRating: values.rating,
                notes: values.notes,
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  RecipeListCard.demo = function RecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <RecipeListCard
          recipe={mockRecipe}
          onDelete={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}
