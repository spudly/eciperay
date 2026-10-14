import type {MealFormViewProps} from '@eciperay/client';
import {useMemo} from 'react';
import {Text, View} from 'react-native';

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
      <Text className="mbe-2 text-sm font-medium text-gray-700">Recipes</Text>
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
      <View className="mbs-4">
        <PrimaryButton
          label="Save meal"
          loading={saving}
          disabled={!title.trim() || selectedRecipeIds.length === 0}
          onPress={onSubmit}
        />
      </View>
    </FormScreenLayout>
  );
};
