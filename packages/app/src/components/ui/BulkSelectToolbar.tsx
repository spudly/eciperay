import type {BulkSelectToolbarProps} from '@eciperay/client';
import {Button, SearchField, Text} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';
import {XStack} from 'tamagui';

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
      <XStack
        flexWrap="wrap"
        gap="$3"
        marginBlockEnd="$3"
      >
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
      </XStack>
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
