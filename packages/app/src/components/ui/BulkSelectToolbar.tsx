import type {BulkSelectToolbarProps} from '@eciperay/client';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {SearchField} from './SearchField';

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
    <View>
      <SearchField
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <View className="
        ui-bulk-select-toolbar-actions mb-3 flex-row flex-wrap gap-3
      ">
        <Pressable
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onSelectAll}
        >
          <Text className="text-primary font-medium">{selectAllLabel}</Text>
        </Pressable>
        <Pressable
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onClearSelection}
        >
          <Text className="font-medium text-gray-600">
            {clearSelectionLabel}
          </Text>
        </Pressable>
        {selectedCount > 0 ? (
          <Text className="text-muted">{selectedCount} selected</Text>
        ) : null}
      </View>
    </View>
  );
};

if (__DEV__) {
  const BulkSelectToolbarDemo = () => {
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

  BulkSelectToolbar.demo = () => <BulkSelectToolbarDemo />;
}
