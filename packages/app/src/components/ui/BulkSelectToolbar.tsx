import type {BulkSelectToolbarProps} from '@eciperay/client';
import {Button, SearchField, Text} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

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
        onChangeText={onSearchChange}
        placeholder={searchPlaceholder}
      />
      <View className="
        ui-bulk-select-toolbar-actions mbe-3 flex-row flex-wrap gap-3
      ">
        <Button
          variant="ghost"
          size="sm"
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onSelectAll}
        >
          {selectAllLabel}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={controlsDisabled || filteredCount === 0}
          onPress={onClearSelection}
        >
          {clearSelectionLabel}
        </Button>
        {selectedCount > 0 ? (
          <Text variant="hint">{selectedCount} selected</Text>
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
