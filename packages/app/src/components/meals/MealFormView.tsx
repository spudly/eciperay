import type {MealFormViewProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {useMemo} from 'react';
import {YStack} from 'tamagui';

import {CheckboxSelectList} from '../ui/CheckboxSelectList';
import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {MultilineField} from '../ui/MultilineField';
import {NumberStepper} from '../ui/NumberStepper';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';

export const MealFormView = ({
  title,
  notes,
  selectedRecipeIds,
  recipeOptions,
  servingsByRecipeId,
  saving,
  error,
  onTitleChange,
  onNotesChange,
  onToggleRecipe,
  onServingsChange,
  onSubmit,
}: MealFormViewProps) => {
  const selectedSet = useMemo(
    () => new Set(selectedRecipeIds),
    [selectedRecipeIds],
  );

  return (
    <FormScreenLayout title={title.trim() ? title : 'Meal'}>
      <TextField
        label="Title"
        value={title}
        onChange={onTitleChange}
        placeholder="Meal title"
      />
      <MultilineField
        value={notes}
        onChange={onNotesChange}
        placeholder="Notes (optional)"
        rows={4}
      />
      <DsText
        marginBlockEnd="$2"
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.medium}
        color={tokens.colors.gray.gray8}
      >
        Recipes
      </DsText>
      <CheckboxSelectList
        items={recipeOptions.map(recipe => ({
          id: recipe.id,
          label: recipe.title,
        }))}
        selectedIds={selectedSet}
        onToggle={onToggleRecipe}
      />
      {selectedRecipeIds.map(recipeId => {
        const recipe = recipeOptions.find(option => option.id === recipeId);
        if (!recipe) {
          return null;
        }
        return (
          <NumberStepper
            key={recipeId}
            label={`Servings · ${recipe.title}`}
            value={servingsByRecipeId[recipeId] ?? recipe.servings}
            onChange={value => {
              onServingsChange(recipeId, value);
            }}
          />
        );
      })}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <YStack marginBlockStart="$4">
        <PrimaryButton
          label="Save meal"
          loading={saving}
          disabled={!title.trim() || selectedRecipeIds.length === 0}
          onPress={onSubmit}
        />
      </YStack>
    </FormScreenLayout>
  );
};
