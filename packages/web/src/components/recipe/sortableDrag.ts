import {reorderRowsByKey} from '@eciperay/client';
import type {DragEndEvent} from '@dnd-kit/core';

export const dragRowOpacity = (isDragging: boolean): number =>
  isDragging ? 0.6 : 1;

export const handleKeyedDragEnd = <T extends {key: string}>(
  event: DragEndEvent,
  rows: T[],
  onChange: (rows: T[]) => void,
) => {
  const {active, over} = event;
  if (!over || active.id === over.id) {
    return;
  }
  const from = rows.findIndex(row => row.key === active.id);
  const to = rows.findIndex(row => row.key === over.id);
  if (from === -1 || to === -1) {
    return;
  }
  onChange(reorderRowsByKey(rows, String(active.id), String(over.id)));
};

export const createListDragEnd =
  <T extends {key: string}>(rows: T[], onChange: (rows: T[]) => void) =>
  (event: DragEndEvent) => {
    handleKeyedDragEnd(event, rows, onChange);
  };
