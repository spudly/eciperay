import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {
  formatRecipeListSubtitle,
  invalidateRecipeQueries,
  makeRecipeDetail,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {View} from 'react-native';
import {Text, XStack, YStack} from 'tamagui';

import {api} from '../lib/api';

import {CookLogForm} from './CookLogForm';
import {ThumbnailListCard} from './ThumbnailListCard';

// The card subtitle is formatted by the shared formatRecipeListSubtitle
// in @eciperay/client (#278) — see the web mirror's parity note.
// The cook-log form is the host CookLogForm (the DS RatingForm
// until @spudly/ui 6.x made the package pages-only): the submit
// view-model's `rating` maps onto the cook log's authorStarRating
// at this boundary, as it did for the DS form (design-system#176).
type Props = {recipe: RecipeDetail; onPress: () => void; onDelete: () => void};

/**
 * The card's trailing actions, re-expressed host-side: the DS Button's small
 * geometry (md radius, sm text, spacing 3/2 padding) with the token color
 * overrides the card always passed (gray fill / gray ink for Log cook, danger
 * fill / danger ink for Delete) now carried by the pressable itself.
 */
const SmallActionButton = ({
  label,
  backgroundColor,
  color,
  onPress,
}: {
  label: string;
  backgroundColor: string;
  color: string;
  onPress: () => void;
}) => (
  <YStack
    backgroundColor={backgroundColor}
    borderRadius={tokens.radii.md}
    paddingHorizontal={tokens.spacing[3]}
    paddingVertical={tokens.spacing[2]}
    alignItems="center"
    justifyContent="center"
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    cursor="pointer"
  >
    <Text
      fontSize={tokens.typography.fontSize.sm}
      color={color}
    >
      {label}
    </Text>
  </YStack>
);

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
              <SmallActionButton
                label="Log cook"
                backgroundColor={tokens.colors.gray.gray2}
                color={tokens.colors.gray.gray8}
                onPress={() => {
                  setShowForm(true);
                }}
              />
            )}
            <SmallActionButton
              label="Delete"
              backgroundColor={tokens.colors.danger.danger1}
              color={tokens.colors.danger.danger7}
              onPress={onDelete}
            />
          </XStack>
        }
      />
      {showForm ? (
        <YStack marginBlockEnd="$3">
          <CookLogForm
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
        </YStack>
      ) : null}
    </View>
  );
};
