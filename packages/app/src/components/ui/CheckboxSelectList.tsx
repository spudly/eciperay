import type {CheckboxSelectListProps} from '@eciperay/client';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {BookLoadingSpinner} from './BookLoadingSpinner';

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
      <View className="ui-loading-center p-4">
        <BookLoadingSpinner size="sm" />
      </View>
    );
  }
  if (items.length === 0) {
    return <Text className="text-muted p-4 text-sm">{emptyMessage}</Text>;
  }
  return (
    <View>
      {items.map(item => (
        <Pressable
          key={item.id}
          className="
            ui-checkbox-select-item flex-row border-b border-gray-100 px-3 py-2
          "
          disabled={disabled}
          onPress={() => {
            onToggle(item.id);
          }}
        >
          <Text className="me-3">{selectedIds.has(item.id) ? '☑' : '☐'}</Text>
          <Text className="min-w-0 flex-1 text-sm text-gray-900">
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

if (__DEV__) {
  const CheckboxSelectListDemo = () => {
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

  CheckboxSelectList.demo = () => <CheckboxSelectListDemo />;
}
