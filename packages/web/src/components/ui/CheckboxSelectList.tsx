import type {CheckboxSelectListProps} from '@eciperay/client';
import {
  CheckboxField as DSCheckboxField,
  Spinner as DSSpinner,
  Text as DSText,
} from '@spudly/ui';
import {useState} from 'react';
import {YStack} from 'tamagui';

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
      <YStack
        alignItems="center"
        padding="$4"
        role="status"
        aria-label="Loading"
      >
        <DSSpinner size="small" />
      </YStack>
    );
  }
  if (items.length === 0) {
    return <DSText variant="hint">{emptyMessage}</DSText>;
  }
  return (
    <YStack gap="$2">
      {items.map(item => (
        <DSCheckboxField
          key={item.id}
          label={item.label}
          checked={selectedIds.has(item.id)}
          disabled={disabled}
          onCheckedChange={() => {
            onToggle(item.id);
          }}
        />
      ))}
    </YStack>
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
