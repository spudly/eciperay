/* eslint-disable max-lines -- draggable ingredient rows with showcase demo */
import {
  createFormRowKey,
  ensureIngredientRowKeys,
  type FormIngredientRow,
} from '@eciperay/client';
import type {IngredientInput} from '@eciperay/types';
import {eciperayTheme, tokens} from '@spudly/ui';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

type FormIngredient = FormIngredientRow & {quantity: number | string | null};

export const resolveDragIndex = (getIndex: () => number | undefined): number =>
  getIndex() ?? 0;

type UpdateIngredient = (
  index: number,
  field: keyof IngredientInput,
  value: string | number | boolean | null,
) => void;

/**
 * This list also renders without a TamaguiProvider (its unit test uses a plain
 * render), so rows stay on RN primitives with every visual value sourced from
 * @spudly/ui tokens — the BookLoadingSpinner pattern. Qty column width (56) is
 * row geometry; it has no step on the DS spacing scale.
 */
const styles = {
  row: {
    marginBottom: tokens.spacing[2],
    flexDirection: 'row',
    gap: tokens.spacing[2],
  } as const,
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
  qtyInput: {
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
    width: 56,
  } as const,
  unitInput: {
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
    width: tokens.spacing[16],
  } as const,
  nameInput: {
    borderRadius: tokens.radii.sm,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
    fontSize: tokens.typography.fontSize.sm,
    flex: 1,
  } as const,
  removeLabel: {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.danger.danger7,
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

type RowProps = {
  ingredient: FormIngredient;
  index: number;
  drag: () => void;
  onUpdate: UpdateIngredient;
  onRemove: () => void;
};

const IngredientRow = ({
  ingredient,
  index,
  drag,
  onUpdate,
  onRemove,
}: RowProps) => (
  <View style={styles.row}>
    <TouchableOpacity
      accessibilityLabel={`Reorder ingredient ${index + 1}`}
      style={styles.dragHandle}
      onLongPress={drag}
      delayLongPress={0}
    >
      <Text style={styles.dragLabel}>Drag</Text>
    </TouchableOpacity>
    <TextInput
      style={styles.qtyInput}
      placeholder="Qty"
      value={ingredient.quantity === null ? '' : String(ingredient.quantity)}
      onChangeText={val => {
        onUpdate(index, 'quantity', val === '' ? null : val);
      }}
    />
    <TextInput
      style={styles.unitInput}
      placeholder="Unit"
      value={ingredient.unit ?? ''}
      onChangeText={val => {
        onUpdate(index, 'unit', val || null);
      }}
    />
    <TextInput
      style={styles.nameInput}
      placeholder="Name"
      value={ingredient.name}
      onChangeText={val => {
        onUpdate(index, 'name', val);
      }}
    />
    <TouchableOpacity onPress={onRemove}>
      <Text style={styles.removeLabel}>Remove</Text>
    </TouchableOpacity>
  </View>
);

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
  const renderItem = ({
    item,
    getIndex,
    drag,
  }: RenderItemParams<FormIngredient>) => {
    const index = resolveDragIndex(getIndex);
    return (
      <IngredientRow
        ingredient={item}
        index={index}
        drag={drag}
        onUpdate={onUpdate}
        onRemove={() => {
          onChange(ingredients.filter((_, idx) => idx !== index));
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
): FormIngredient => ({
  key: createFormRowKey(),
  sortOrder,
  name: '',
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
});

if (__DEV__) {
  const SortableIngredientListDemo = () => {
    const [ingredients, setIngredients] = useState<FormIngredientRow[]>(() =>
      ensureIngredientRowKeys([
        {
          ...createEmptyIngredientRow(0),
          name: 'Flour',
          quantity: 2,
          unit: 'cups',
        },
      ]),
    );

    return (
      <SortableIngredientList
        ingredients={ingredients}
        onChange={setIngredients}
        onUpdate={(index, field, value) => {
          setIngredients(prev =>
            prev.map((row, rowIndex) =>
              rowIndex === index ? {...row, [field]: value} : row,
            ),
          );
        }}
        onAdd={() => {
          setIngredients(prev => [
            ...prev,
            createEmptyIngredientRow(prev.length),
          ]);
        }}
      />
    );
  };

  SortableIngredientList.demo = () => <SortableIngredientListDemo />;
}
