import type {ShoppingListViewProps} from '@eciperay/client';
import {Pressable, Text, View} from 'react-native';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {PageTitle} from '../ui/PageTitle';
import {ScreenScroll} from '../ui/ScreenScroll';

export const ShoppingListView = ({
  lines,
  isLoading,
  checkedKeys,
  onToggleChecked,
}: ShoppingListViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">Shopping list</PageTitle>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : lines.length === 0 ? (
      <EmptyMessage>No items on this list.</EmptyMessage>
    ) : (
      <View>
        {lines.map(line => {
          const checked = checkedKeys.has(line.key);
          const qty =
            line.quantity === null
              ? ''
              : `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`;
          return (
            <Pressable
              key={line.key}
              className="
                flex-row items-start gap-3 border-be border-gray-100 py-3
              "
              onPress={() => {
                onToggleChecked(line.key);
              }}
            >
              <Text className="mbs-0.5">{checked ? '☑' : '☐'}</Text>
              <Text
                className={
                  checked
                    ? 'text-muted flex-1 line-through'
                    : `flex-1 text-gray-900`
                }
              >
                <Text className="font-medium">{line.name}</Text>
                {qty ? (
                  <Text className="text-muted text-sm"> · {qty}</Text>
                ) : null}
                {line.isOptional ? (
                  <Text className="text-muted text-sm"> · optional</Text>
                ) : null}
              </Text>
            </Pressable>
          );
        })}
      </View>
    )}
  </ScreenScroll>
);
