import type {MealPlanFormViewProps} from '@eciperay/client';
import {useMemo} from 'react';

import {CheckboxSelectList} from '../ui/CheckboxSelectList.js';
import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';
import {MultilineField} from '../ui/MultilineField.js';
import {NumberStepper} from '../ui/NumberStepper.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';

export const MealPlanFormView = ({
  title,
  notes,
  startsOn,
  endsOn,
  selectedKeys,
  entryOptions,
  quantityByKey,
  servingsByRecipeId,
  saving,
  error,
  onTitleChange,
  onNotesChange,
  onStartsOnChange,
  onEndsOnChange,
  onToggleEntry,
  onQuantityChange,
  onRecipeServingsChange,
  onSubmit,
}: MealPlanFormViewProps) => {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  return (
    <FormScreenLayout title={title.trim() ? title : 'Meal plan'}>
      <TextField
        label="Title"
        value={title}
        onChange={onTitleChange}
        placeholder="Plan title"
      />
      <MultilineField
        value={notes}
        onChange={onNotesChange}
        placeholder="Notes (optional)"
        rows={4}
      />
      <TextField
        label="Starts on"
        value={startsOn}
        onChange={onStartsOnChange}
        placeholder="YYYY-MM-DD"
      />
      <TextField
        label="Ends on"
        value={endsOn}
        onChange={onEndsOnChange}
        placeholder="YYYY-MM-DD"
      />
      <p className="mbe-2 text-sm font-medium text-gray-700">Meals & recipes</p>
      <CheckboxSelectList
        items={entryOptions.map(entry => ({
          id: entry.kind === 'meal' ? `meal:${entry.id}` : `recipe:${entry.id}`,
          label:
            entry.kind === 'meal'
              ? `Meal · ${entry.title}`
              : `Recipe · ${entry.title}`,
        }))}
        selectedIds={selectedSet}
        onToggle={onToggleEntry}
      />
      {selectedKeys.map(key => {
        const option = entryOptions.find(entry => {
          const entryKey =
            entry.kind === 'meal' ? `meal:${entry.id}` : `recipe:${entry.id}`;
          return entryKey === key;
        });
        if (!option) {
          return null;
        }
        if (option.kind === 'meal') {
          return (
            <NumberStepper
              key={key}
              label={`Quantity · ${option.title}`}
              value={quantityByKey[key] ?? 1}
              onChange={value => {
                onQuantityChange(key, value);
              }}
            />
          );
        }
        return (
          <div key={key}>
            <NumberStepper
              label={`Quantity · ${option.title}`}
              value={quantityByKey[key] ?? 1}
              onChange={value => {
                onQuantityChange(key, value);
              }}
            />
            <NumberStepper
              label={`Servings · ${option.title}`}
              value={servingsByRecipeId[option.id] ?? option.servings}
              onChange={value => {
                onRecipeServingsChange(option.id, value);
              }}
            />
          </div>
        );
      })}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton
        label="Save plan"
        loading={saving}
        disabled={!title.trim() || selectedKeys.length === 0}
        onPress={onSubmit}
      />
    </FormScreenLayout>
  );
};
