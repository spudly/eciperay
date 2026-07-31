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
import {useState} from 'react';

import {SortableInstructionRow} from './SortableInstructionRow.js';
import {createListDragEnd} from './sortableDrag.js';

type Props = {
  instructions: FormInstructionRow[];
  onChange: (instructions: FormInstructionRow[]) => void;
  onUpdate: (index: number, body: string) => void;
  onAdd: () => void;
};

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
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Instructions</p>
        <button
          type="button"
          className="text-primary text-sm"
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
