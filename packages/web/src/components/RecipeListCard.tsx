import {
  formatRecipeListSubtitle,
  invalidateRecipeQueries,
  makeRecipeDetail,
  type ShowcaseFrameProps,
} from '@eciperay/client';
import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState, type ComponentType} from 'react';

import {eciperay} from '../lib/api.js';

import {CookLogForm} from './cooking/CookLogForm.js';
import {ThumbnailListCard} from './ui/ThumbnailListCard.js';

// Parity note (#278): the card subtitle is formatted by the shared
// formatRecipeListSubtitle in @eciperay/client — the per-mirror local
// copies are gone, so the servings pluralization and satiety label are
// defined once for both mirrors and the app's DS-page hosts.
// Parity note (design-system#126): the app mirror now imports
// CookLogForm from @spudly/ui instead of a local components copy;
// this mirror keeps importing its own cooking/CookLogForm until web
// adoption in B7.

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
          <div className="ms-3 flex shrink-0 items-center gap-2">
            {showForm ? null : confirmingDelete ? (
              <>
                <button
                  type="button"
                  className="
                    rounded-lg bg-red-600 px-3 py-1 text-sm text-white
                    disabled:opacity-50
                  "
                  disabled={isDeleting}
                  onClick={() => {
                    onDelete(recipe.id);
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  className="
                    rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700
                    disabled:opacity-50
                  "
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
                  className="
                    rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-700
                  "
                  onClick={() => {
                    setShowForm(true);
                  }}
                >
                  Log cook
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
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
          className="mbe-3 text-sm text-red-600"
        >
          {deleteError}
        </p>
      ) : null}
      {showForm ? (
        <div className="mbe-3">
          <CookLogForm
            variant="light"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={input => {
              createMutation.mutate(input);
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
