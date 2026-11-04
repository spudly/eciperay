import type {IngredientInput} from '@eciperay/types';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import type {FormIngredientRow} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';

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

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
const fieldStyle = (span: number): CSSProperties => ({
  gridColumn: `span ${span} / span ${span}`,
  borderRadius: 2,
  border: `1px solid ${tokens.colors.gray.gray4}`,
  backgroundColor: eciperayTheme.semantic.surface,
  padding: '4px 8px',
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  color: tokens.colors.gray.gray10,
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
});

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
        marginBottom: tokens.spacing[2],
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: tokens.spacing[2],
      }}
    >
      <input
        style={fieldStyle(2)}
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
        style={fieldStyle(2)}
        placeholder="Unit"
        value={ingredient.unit ?? ''}
        onChange={e => {
          onUpdate(index, 'unit', e.target.value || null);
        }}
      />
      <input
        style={fieldStyle(4)}
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
        style={{
          gridColumn: 'span 2 / span 2',
          cursor: 'grab',
          borderRadius: 2,
          border: `1px solid ${tokens.colors.gray.gray4}`,
          backgroundColor: 'transparent',
          padding: '4px 8px',
          fontSize: tokens.typography.fontSize.xs,
          fontFamily: tokens.typography.fontFamily.sans,
          color: tokens.colors.gray.gray8,
        }}
        {...attributes}
        {...listeners}
      >
        Drag
      </button>
      <button
        type="button"
        style={{
          gridColumn: 'span 2 / span 2',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: tokens.typography.fontSize.sm,
          fontFamily: tokens.typography.fontFamily.sans,
          color: tokens.colors.danger.danger7,
        }}
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
};
