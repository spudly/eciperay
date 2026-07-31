import {
  groupShowcaseEntriesByCategory,
  type ComponentShowcaseEntry,
} from '@eciperay/client';
import clsx from 'clsx';
import {Pressable, ScrollView, Text, View} from 'react-native';

export type ShowcasePickerProps = {
  value: string;
  onChange: (id: string) => void;
  entries: ComponentShowcaseEntry[];
};

export const ShowcasePicker = ({
  value,
  onChange,
  entries,
}: ShowcasePickerProps) => {
  const grouped = groupShowcaseEntriesByCategory(entries);

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">Component</Text>
      <View
        className="
          ui-showcase-picker-list max-h-48 rounded-lg border border-gray-300
        "
      >
        <ScrollView nestedScrollEnabled>
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category}>
              <Text className="ui-showcase-picker-category">{category}</Text>
              {items.map(item => {
                const selected = item.id === value;
                return (
                  <Pressable
                    key={item.id}
                    className={clsx('ui-showcase-picker-item', {
                      'ui-showcase-picker-item-selected': selected,
                    })}
                    onPress={() => {
                      onChange(item.id);
                    }}
                  >
                    <Text
                      className={clsx('ui-showcase-picker-item-text', {
                        'ui-showcase-picker-item-text-selected': selected,
                      })}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
