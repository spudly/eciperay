import {useSortable} from '@dnd-kit/sortable';
import {tokens} from '@spudly/ui';

import {dragRowOpacity} from './sortableDrag.js';

type Props = {rowKey: string; label: string};

/**
 * The web host's dnd-kit drag handle for one DS recipe-form row (B7 T5,
 * eciperay#555): Stephen's 2026-11-09 boundary on design-system#130 keeps the
 * drag container host-side — this component holds the row's sortable activator
 * and is bound into the DS row views through their lists' `renderDragHandle`,
 * so no drag library enters the design system. The host's single DndContext (in
 * RecipeFormHost) routes the drag-end back to the owning list as a new rows
 * array via sortableDrag.ts.
 */
export const SortableDragHandle = ({rowKey, label}: Props) => {
  const {attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging} =
    useSortable({id: rowKey});

  return (
    <button
      ref={node => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      type="button"
      aria-label={label}
      style={{
        cursor: 'grab',
        borderRadius: 2,
        border: `1px solid ${tokens.colors.gray.gray4}`,
        backgroundColor: 'transparent',
        padding: '4px 8px',
        fontSize: tokens.typography.fontSize.xs,
        fontFamily: tokens.typography.fontFamily.sans,
        color: tokens.colors.gray.gray8,
        opacity: dragRowOpacity(isDragging),
      }}
      {...attributes}
      {...listeners}
    >
      Drag
    </button>
  );
};
