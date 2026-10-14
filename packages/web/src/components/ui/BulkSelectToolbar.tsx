import type {BulkSelectToolbarProps} from '@eciperay/client';
import {Button as DSButton, Text as DSText} from '@spudly/ui';
import {useState} from 'react';
import {XStack, YStack} from 'tamagui';

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
    <YStack gap="$2">
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <XStack
        gap="$3"
        alignItems="center"
      >
        <DSButton
          variant="ghost"
          size="sm"
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onSelectAll}
        >
          {selectAllLabel}
        </DSButton>
        <DSButton
          variant="ghost"
          size="sm"
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onClearSelection}
        >
          {clearSelectionLabel}
        </DSButton>
        {selectedCount > 0 ? (
          <DSText variant="hint">{selectedCount} selected</DSText>
        ) : null}
      </XStack>
    </YStack>
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
