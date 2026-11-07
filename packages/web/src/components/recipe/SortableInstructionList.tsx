import {createFormRowKey, type FormInstructionRow} from '@eciperay/client';
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

import {SortableInstructionRow} from './SortableInstructionRow.js';
import {createListDragEnd} from './sortableDrag.js';

type Props = {
  instructions: FormInstructionRow[];
  onChange: (instructions: FormInstructionRow[]) => void;
  onUpdate: (index: number, body: string) => void;
  onAdd: () => void;
};

// Field backgrounds (issue #167): the row inputs rendered by this list
// (see the platform-only Sortable*Row primitives) use the shared field
// background (#fffdf8, the Warm Harvest surface). The app mirror's row
// inputs fill with eciperayTheme.semantic.surface — the same value.
// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const SortableInstructionList = ({
  instructions,
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
          Instructions
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
        onDragEnd={createListDragEnd(instructions, onChange)}
      >
        <SortableContext
          items={instructions.map(instruction => instruction.key)}
          strategy={verticalListSortingStrategy}
        >
          {instructions.map((instruction, index) => (
            <SortableInstructionRow
              key={instruction.key}
              instruction={instruction}
              index={index}
              onUpdate={onUpdate}
              onRemove={() => {
                onChange(instructions.filter((_, idx) => idx !== index));
              }}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const createEmptyInstructionRow = (
  stepNumber: number,
): FormInstructionRow => ({key: createFormRowKey(), stepNumber, body: ''});

export {
  dragRowOpacity,
  handleKeyedDragEnd as applyInstructionDragEnd,
  createListDragEnd as instructionListDragEnd,
} from './sortableDrag.js';

if (import.meta.env.DEV) {
  const SortableInstructionListDemo = () => {
    const [instructions, setInstructions] = useState<FormInstructionRow[]>(
      () => [{...createEmptyInstructionRow(1), body: 'Mix dry ingredients.'}],
    );

    return (
      <SortableInstructionList
        instructions={instructions}
        onChange={setInstructions}
        onUpdate={(index, body) => {
          setInstructions(prev =>
            prev.map((row, rowIndex) =>
              rowIndex === index ? {...row, body} : row,
            ),
          );
        }}
        onAdd={() => {
          setInstructions(prev => [
            ...prev,
            createEmptyInstructionRow(prev.length + 1),
          ]);
        }}
      />
    );
  };

  SortableInstructionList.demo = function SortableInstructionListDemoWrapper() {
    return <SortableInstructionListDemo />;
  };
}
