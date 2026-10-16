import type {MealPlanFormViewProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {useMemo} from 'react';
import {View} from 'react-native';
import {YStack} from 'tamagui';

import {CheckboxSelectList} from '../ui/CheckboxSelectList';
import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {MultilineField} from '../ui/MultilineField';
import {NumberStepper} from '../ui/NumberStepper';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';

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
      <DsText
        marginBlockEnd="$2"
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.medium}
        color={tokens.colors.gray.gray8}
      >
        Meals & recipes
      </DsText>
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
          <View key={key}>
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
          </View>
        );
      })}
      {error ? <ErrorText>{error}</ErrorText> : null}
      <YStack marginBlockStart="$4">
        <PrimaryButton
          label="Save plan"
          loading={saving}
          disabled={!title.trim() || selectedKeys.length === 0}
          onPress={onSubmit}
        />
      </YStack>
    </FormScreenLayout>
  );
};
