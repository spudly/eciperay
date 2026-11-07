import {
  createFormRowKey,
  ensureIngredientRowKeys,
  type FormIngredientRow,
} from '@eciperay/client';
import type {IngredientInput} from '@eciperay/types';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {eciperayTheme, tokens} from '@spudly/ui';
import {useState} from 'react';

import {SortableIngredientRow} from './SortableIngredientRow.js';
import {createListDragEnd} from './sortableDrag.js';

type UpdateIngredient = (
  index: number,
  field: keyof IngredientInput,
  value: string | number | boolean | null,
) => void;

type Props = {
  ingredients: FormIngredientRow[];
  onChange: (ingredients: FormIngredientRow[]) => void;
  onUpdate: UpdateIngredient;
  onAdd: () => void;
};

// Field backgrounds (issue #167): the row inputs rendered by this list
// (see the platform-only Sortable*Row primitives) use the shared field
// background (#fffdf8, the Warm Harvest surface). The app mirror's row
// inputs fill with eciperayTheme.semantic.surface — the same value.
// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const SortableIngredientList = ({
  ingredients,
  onChange,
  onUpdate,
  onAdd,
}: Props) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  return (
    <div>
      <div
        style={{
          marginBottom: tokens.spacing[2],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.gray.gray8,
          }}
        >
          Ingredients
        </p>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: eciperayTheme.semantic.primary,
            fontSize: tokens.typography.fontSize.sm,
            fontFamily: tokens.typography.fontFamily.sans,
          }}
          onClick={onAdd}
        >
          + Add
        </button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={createListDragEnd(ingredients, onChange)}
      >
        <SortableContext
          items={ingredients.map(ingredient => ingredient.key)}
          strategy={verticalListSortingStrategy}
        >
          {ingredients.map((ingredient, index) => (
            <SortableIngredientRow
              key={ingredient.key}
              ingredient={ingredient}
              index={index}
              onUpdate={onUpdate}
              onRemove={() => {
                onChange(ingredients.filter((_, idx) => idx !== index));
              }}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const createEmptyIngredientRow = (
  sortOrder: number,
): FormIngredientRow => ({
  key: createFormRowKey(),
  sortOrder,
  name: '',
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
});

export {
  dragRowOpacity,
  handleKeyedDragEnd as applyIngredientDragEnd,
  createListDragEnd as ingredientListDragEnd,
} from './sortableDrag.js';

if (import.meta.env.DEV) {
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

  SortableIngredientList.demo = function SortableIngredientListDemoWrapper() {
    return <SortableIngredientListDemo />;
  };
}
