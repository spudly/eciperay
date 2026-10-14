/* eslint-disable max-lines -- draggable ingredient rows with showcase demo */
import {
  createFormRowKey,
  ensureIngredientRowKeys,
  type FormIngredientRow,
} from '@eciperay/client';
import type {IngredientInput} from '@eciperay/types';
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
  <View className="mbe-2 flex-row gap-2">
    <TouchableOpacity
      accessibilityLabel={`Reorder ingredient ${index + 1}`}
      className="justify-center rounded-sm border border-gray-300 px-2 py-1"
      onLongPress={drag}
      delayLongPress={0}
    >
      <Text className="text-xs text-gray-700">Drag</Text>
    </TouchableOpacity>
    <TextInput
      className="rounded-sm border border-gray-300 px-2 py-1 text-sm inline-14"
      placeholder="Qty"
      value={ingredient.quantity === null ? '' : String(ingredient.quantity)}
      onChangeText={val => {
        onUpdate(index, 'quantity', val === '' ? null : val);
      }}
    />
    <TextInput
      className="rounded-sm border border-gray-300 px-2 py-1 text-sm inline-16"
      placeholder="Unit"
      value={ingredient.unit ?? ''}
      onChangeText={val => {
        onUpdate(index, 'unit', val || null);
      }}
    />
    <TextInput
      className="flex-1 rounded-sm border border-gray-300 px-2 py-1 text-sm"
      placeholder="Name"
      value={ingredient.name}
      onChangeText={val => {
        onUpdate(index, 'name', val);
      }}
    />
    <TouchableOpacity onPress={onRemove}>
      <Text className="text-sm text-red-600">Remove</Text>
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
      <View className="mbe-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700">Ingredients</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text className="text-primary text-sm">+ Add</Text>
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
