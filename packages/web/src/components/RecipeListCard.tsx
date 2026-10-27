import {
  formatRecipeListMeta,
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

// Parity note (#49, stage 2): the app mirror exports its
// formatRecipeSubtitle so the app's Recipes view can format the DS
// page's items with the card's own helper. This mirror keeps its local
// copy — the web view still renders these cards directly.
// Parity note (design-system#126): the app mirror now imports
// CookLogForm from @spudly/ui instead of a local components copy;
// this mirror keeps importing its own cooking/CookLogForm until web
// adoption in B7.
const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type RecipeListCardProps = {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
  onPress?: () => void;
};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const RecipeListCard = ({
  recipe,
  onDelete,
  onPress,
}: RecipeListCardProps) => {
  const [showForm, setShowForm] = useState(false);
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
        subtitle={formatRecipeSubtitle(recipe)}
        onPress={onPress}
        linkTo={onPress ? undefined : `/recipes/${recipe.id}`}
        trailing={
          <div className="ms-3 flex shrink-0 items-center gap-2">
            {showForm ? null : (
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
            )}
            <button
              type="button"
              className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
              onClick={() => {
                if (window.confirm(`Delete "${recipe.title}"?`)) {
                  onDelete(recipe.id);
                }
              }}
            >
              Delete
            </button>
          </div>
        }
      />
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
