import type {BulkSelectToolbarProps} from '@eciperay/client';
import {useState} from 'react';

import {SearchField} from './SearchField.js';

export const BulkSelectToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  selectedCount,
  filteredCount,
  disabled = false,
  busy = false,
  onSelectAll,
  onClearSelection,
  selectAllLabel = 'Select all',
  clearSelectionLabel = 'Clear selection',
}: BulkSelectToolbarProps) => {
  const controlsDisabled = disabled || busy;

  return (
    <>
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <div className="ui-bulk-select-toolbar-actions">
        <button
          type="button"
          className="
            text-primary font-medium
            disabled:opacity-50
          "
          disabled={controlsDisabled || filteredCount === 0}
          onClick={onSelectAll}
        >
          {selectAllLabel}
        </button>
        <button
          type="button"
          className="
            font-medium text-gray-600
            disabled:opacity-50
          "
          disabled={controlsDisabled || filteredCount === 0}
          onClick={onClearSelection}
        >
          {clearSelectionLabel}
        </button>
        {selectedCount > 0 ? (
          <span className="text-muted">{selectedCount} selected</span>
        ) : null}
      </div>
    </>
  );
};

if (import.meta.env.DEV) {
  BulkSelectToolbar.demo = function BulkSelectToolbarDemo() {
    const [search, setSearch] = useState('');

    return (
      <BulkSelectToolbar
        search={search}
        onSearchChange={setSearch}
        selectedCount={1}
        filteredCount={3}
        onSelectAll={() => {
          void 0;
        }}
        onClearSelection={() => {
          void 0;
        }}
      />
    );
  };
}
