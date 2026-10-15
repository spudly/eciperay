import type {IngredientInput} from '@eciperay/types';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {FormIngredientRow} from '@eciperay/client';

import {dragRowOpacity} from './sortableDrag.js';

type UpdateIngredient = (
  index: number,
  field: keyof IngredientInput,
  value: string | number | boolean | null,
) => void;

type Props = {
  ingredient: FormIngredientRow;
  index: number;
  onUpdate: UpdateIngredient;
  onRemove: () => void;
};

export const SortableIngredientRow = ({
  ingredient,
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
  } = useSortable({id: ingredient.key});

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: dragRowOpacity(isDragging),
      }}
      className="mbe-2 grid grid-cols-12 gap-2"
    >
      <input
        className="
          col-span-2 rounded-sm border border-gray-300 px-2 py-1 text-sm
        "
        placeholder="Qty"
        value={ingredient.quantity ?? ''}
        onChange={e => {
          onUpdate(
            index,
            'quantity',
            e.target.value === '' ? null : e.target.value,
          );
        }}
      />
      <input
        className="
          col-span-2 rounded-sm border border-gray-300 px-2 py-1 text-sm
        "
        placeholder="Unit"
        value={ingredient.unit ?? ''}
        onChange={e => {
          onUpdate(index, 'unit', e.target.value || null);
        }}
      />
      <input
        className="
          col-span-4 rounded-sm border border-gray-300 px-2 py-1 text-sm
        "
        placeholder="Name"
        required
        value={ingredient.name}
        onChange={e => {
          onUpdate(index, 'name', e.target.value);
        }}
      />
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder ingredient ${index + 1}`}
        className="
          col-span-2 cursor-grab rounded-sm border border-gray-300 px-2 py-1
          text-xs text-gray-700
          active:cursor-grabbing
        "
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
      <button
        type="button"
        className="col-span-2 text-sm text-red-600"
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
};
