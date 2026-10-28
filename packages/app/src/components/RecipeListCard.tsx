import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {
  formatRecipeListSubtitle,
  invalidateRecipeQueries,
  makeRecipeDetail,
} from '@eciperay/client';
import {Button as DsButton, CookLogForm, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {View} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {api} from '../lib/api';

import {ThumbnailListCard} from './ui/ThumbnailListCard';

// The card subtitle is formatted by the shared formatRecipeListSubtitle
// in @eciperay/client (#278) — see the web mirror's parity note.
// B7 cluster C6 (design-system#130): the web mirror now imports
// CookLogForm from @spudly/ui too (its home list renders the design
// system HomePage), matching this mirror — no app-side change needed.
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
        subtitle={formatRecipeListSubtitle(recipe)}
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
