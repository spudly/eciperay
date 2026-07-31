import type {CheckboxSelectListProps} from '@eciperay/client';
import {useState} from 'react';

import {BookLoadingSpinner} from './BookLoadingSpinner.js';

export const CheckboxSelectList = ({
  items,
  selectedIds,
  onToggle,
  disabled = false,
  isLoading = false,
  emptyMessage = 'No items found.',
}: CheckboxSelectListProps) => {
  if (isLoading) {
    return (
      <div className="ui-loading-center p-4">
        <BookLoadingSpinner size="sm" />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-muted p-4 text-sm">{emptyMessage}</p>;
  }
  return (
    <ul className="ui-checkbox-select-list">
      {items.map(item => (
        <li key={item.id}>
          <label className="ui-checkbox-select-item">
            <input
              type="checkbox"
              className="size-4 rounded border-gray-300"
              checked={selectedIds.has(item.id)}
              disabled={disabled}
              onChange={() => {
                onToggle(item.id);
              }}
            />
            <span className="min-w-0 flex-1 text-sm text-gray-900">
              {item.label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
};

if (import.meta.env.DEV) {
  CheckboxSelectList.demo = function CheckboxSelectListDemo() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
      () => new Set(['a']),
    );

    return (
      <CheckboxSelectList
        items={[
          {id: 'a', label: 'Alpha'},
          {id: 'b', label: 'Beta'},
        ]}
        selectedIds={selectedIds}
        onToggle={id => {
          setSelectedIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          });
        }}
      />
    );
  };
}
