import type {FormInstructionRow} from '@eciperay/client';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

import {dragRowOpacity} from './sortableDrag.js';

type Props = {
  instruction: FormInstructionRow;
  index: number;
  onUpdate: (index: number, body: string) => void;
  onRemove: () => void;
};

export const SortableInstructionRow = ({
  instruction,
  index,
  onUpdate,
  onRemove,
}: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({id: instruction.key});

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: dragRowOpacity(isDragging),
      }}
      className="mb-2 flex gap-2"
    >
      <span className="text-muted pt-2 text-sm">{index + 1}.</span>
      <textarea
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        required
        rows={2}
        value={instruction.body}
        onChange={e => {
          onUpdate(index, e.target.value);
        }}
      />
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder step ${index + 1}`}
        className="
          cursor-grab rounded border border-gray-300 px-2 py-1 text-xs
          text-gray-700
          active:cursor-grabbing
        "
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
      <button
        type="button"
        className="text-sm text-red-600"
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
};
