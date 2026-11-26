import {
  createFormRowKey,
  ingredientRowIdForKey,
  type FormIngredientRow,
} from '@eciperay/client';
import type {IngredientInput} from '@eciperay/types';
import {useLingui} from '@lingui/react';
import {eciperayTheme, RecipeIngredientRowView, tokens} from '@spudly/ui';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

type FormIngredient = FormIngredientRow & {quantity: number | string | null};

/**
 * The DS row view's field-change contract (its field type is not exported from
 * the package root — only the view and its props are).
 */
type RecipeIngredientField = 'quantity' | 'unit' | 'name';

export const resolveDragIndex = (getIndex: () => number | undefined): number =>
  getIndex() ?? 0;

type UpdateIngredient = (
  index: number,
  field: keyof IngredientInput,
  value: string | number | boolean | null,
) => void;

/**
 * B7 T5 native tranche (#555): the DraggableFlatList container stays host-side
 * (Stephen's 2026-11-09 boundary — no drag library enters the DS) and renders
 * the DS `RecipeIngredientRowView` from its renderItem, binding the host drag
 * handle into the row. The list header (title + add intent) is list chrome the
 * host still owns: @spudly/ui exports the row views only, not the list view.
 */
const styles = {
  dragHandle: {
    justifyContent: 'center',
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  } as const,
  dragLabel: {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.gray.gray8,
  } as const,
  header: {
    marginBottom: tokens.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
  headerTitle: {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray.gray8,
  } as const,
  addLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: eciperayTheme.semantic.primary,
  } as const,
};

type Props = {
  ingredients: FormIngredient[];
  onChange: (ingredients: FormIngredient[]) => void;
  onUpdate: UpdateIngredient;
  onAdd: () => void;
};

export const SortableIngredientList = ({
  ingredients,
  onChange,
  onUpdate,
  onAdd,
}: Props) => {
  const {i18n} = useLingui();
  const renderItem = ({
    item,
    getIndex,
    drag,
  }: RenderItemParams<FormIngredient>) => {
    const index = resolveDragIndex(getIndex);
    return (
      <RecipeIngredientRowView
        row={{
          key: item.key,
          quantity: item.quantity === null ? '' : String(item.quantity),
          unit: item.unit ?? '',
          name: item.name,
        }}
        index={index}
        dragHandle={
          <TouchableOpacity
            accessibilityLabel={i18n._({
              id: 'recipeForm.reorderIngredient',
              message: 'Reorder ingredient {position}',
              values: {position: index + 1},
            })}
            style={styles.dragHandle}
            onLongPress={drag}
            delayLongPress={0}
          >
            <Text style={styles.dragLabel}>Drag</Text>
          </TouchableOpacity>
        }
        onFieldChange={(
          _rowKey: string,
          field: RecipeIngredientField,
          value: string,
        ) => {
          // Preserve the retired host row's fold: an emptied quantity
          // or unit crosses to the form state as null, never "".
          onUpdate(
            index,
            field,
            value === '' && field !== 'name' ? null : value,
          );
        }}
        onRemove={() => {
          onChange(ingredients.filter(entry => entry.key !== item.key));
        }}
      />
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ingredients</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text style={styles.addLabel}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <DraggableFlatList
        data={ingredients}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        scrollEnabled={false}
        onDragEnd={({data}) => {
          onChange(data);
        }}
      />
    </View>
  );
};

export const createEmptyIngredientRow = (
  sortOrder: number,
): FormIngredient => {
  const key = createFormRowKey();
  return {
    key,
    // Stamp the row key as the ingredient's ID (#643) so steps can
    // link to a not-yet-saved ingredient and the references resolve
    // on save; undefined for non-UUID fallback keys.
    id: ingredientRowIdForKey(key),
    sortOrder,
    name: '',
    quantity: null,
    unit: null,
    notes: null,
    isOptional: false,
  };
};
