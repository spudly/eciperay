import type {FormInstructionRow} from '@eciperay/client';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {eciperayTheme, tokens} from '@spudly/ui';

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
        marginBottom: tokens.spacing[2],
        display: 'flex',
        gap: tokens.spacing[2],
      }}
    >
      <span
        style={{
          color: eciperayTheme.semantic.textMuted,
          paddingTop: tokens.spacing[2],
          fontSize: tokens.typography.fontSize.sm,
        }}
      >
        {index + 1}.
      </span>
      <textarea
        style={{
          flex: 1,
          borderRadius: 2,
          border: `1px solid ${tokens.colors.gray.gray4}`,
          backgroundColor: eciperayTheme.semantic.surface,
          padding: '4px 8px',
          fontSize: tokens.typography.fontSize.sm,
          fontFamily: tokens.typography.fontFamily.sans,
          color: tokens.colors.gray.gray10,
          boxSizing: 'border-box',
        }}
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
        style={{
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
          alignSelf: 'flex-start',
          padding: 0,
          paddingTop: tokens.spacing[2],
          background: 'none',
          border: 'none',
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
