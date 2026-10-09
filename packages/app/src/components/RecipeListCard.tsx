import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {
  formatRecipeListMeta,
  invalidateRecipeQueries,
  makeRecipeDetail,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {api} from '../lib/api';

import {CookLogForm} from './cooking/CookLogForm';
import {ThumbnailListCard} from './ui/ThumbnailListCard';

const formatRecipeSubtitle = (recipe: RecipeDetail) =>
  `${recipe.servings} servings${recipe.cookTimeMin ? ` · ${recipe.cookTimeMin} min` : ''} · ${formatRecipeListMeta(recipe)}`;

type Props = {recipe: RecipeDetail; onPress: () => void; onDelete: () => void};

export const RecipeListCard = ({recipe, onPress, onDelete}: Props) => {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      api.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      setShowForm(false);
    },
  });

  return (
    <View>
      <ThumbnailListCard
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        subtitle={formatRecipeSubtitle(recipe)}
        onPress={onPress}
        trailing={
          <View className="ms-3 flex-row items-center gap-2">
            {showForm ? null : (
              <TouchableOpacity
                className="rounded-lg bg-gray-100 px-3 py-1"
                onPress={() => {
                  setShowForm(true);
                }}
              >
                <Text className="text-sm text-gray-700">Log cook</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="rounded-lg bg-red-50 px-3 py-1"
              onPress={onDelete}
            >
              <Text className="text-sm text-red-600">Delete</Text>
            </TouchableOpacity>
          </View>
        }
      />
      {showForm ? (
        <View className="mb-3">
          <CookLogForm
            variant="light"
            secondaryLabel="Cancel"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={input => {
              createMutation.mutate(input);
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

if (__DEV__) {
  const recipeListCardDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeListCard
        recipe={makeRecipeDetail()}
        onPress={() => {
          void 0;
        }}
        onDelete={() => {
          void 0;
        }}
      />
    </Frame>
  );
  RecipeListCard.demo = recipeListCardDemo;
}
