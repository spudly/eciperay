import type {MealFormViewProps} from '@eciperay/client';
import {useMemo} from 'react';

import {CheckboxSelectList} from '../ui/CheckboxSelectList.js';
import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';
import {MultilineField} from '../ui/MultilineField.js';
import {NumberStepper} from '../ui/NumberStepper.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';

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
      <p className="mb-2 text-sm font-medium text-gray-700">Recipes</p>
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
      <PrimaryButton
        label="Save meal"
        loading={saving}
        disabled={!title.trim() || selectedRecipeIds.length === 0}
        onPress={onSubmit}
      />
    </FormScreenLayout>
  );
};
