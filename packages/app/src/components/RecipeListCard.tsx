import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {
  formatRecipeListMeta,
  invalidateRecipeQueries,
  makeRecipeDetail,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Button as DsButton, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {View} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {api} from '../lib/api';

import {CookLogForm} from './cooking/CookLogForm';
import {ThumbnailListCard} from './ui/ThumbnailListCard';

export const formatRecipeSubtitle = (recipe: RecipeDetail) =>
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
          <XStack
            marginInlineStart="$3"
            alignItems="center"
            gap="$2"
          >
            {showForm ? null : (
              <DsButton
                variant="secondary"
                size="sm"
                backgroundColor={tokens.colors.gray.gray2}
                color={tokens.colors.gray.gray8}
                onPress={() => {
                  setShowForm(true);
                }}
              >
                Log cook
              </DsButton>
            )}
            <DsButton
              variant="secondary"
              size="sm"
              backgroundColor={tokens.colors.danger.danger1}
              color={tokens.colors.danger.danger7}
              onPress={onDelete}
            >
              Delete
            </DsButton>
          </XStack>
        }
      />
      {showForm ? (
        <YStack marginBlockEnd="$3">
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
        </YStack>
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
