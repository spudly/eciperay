import type {CheckboxSelectListProps} from '@eciperay/client';
import {
  CheckboxField as DsCheckboxField,
  EmptyState,
  Spinner,
} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'react-native';

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
        <Spinner />
      </View>
    );
  }
  if (items.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }
  return (
    <View>
      {items.map(item => (
        <DsCheckboxField
          key={item.id}
          label={item.label}
          checked={selectedIds.has(item.id)}
          onCheckedChange={() => {
            onToggle(item.id);
          }}
          disabled={disabled}
        />
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
