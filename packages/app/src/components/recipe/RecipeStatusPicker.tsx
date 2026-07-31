import {RECIPE_STATUS_LABELS, RECIPE_STATUS_OPTIONS} from '@eciperay/client';
import type {RecipeStatus} from '@eciperay/types';
import clsx from 'clsx';
import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  value: RecipeStatus;
  onChange: (status: RecipeStatus) => void;
  disabled?: boolean;
};

export const RecipeStatusPicker = ({
  value,
  onChange,
  disabled = false,
}: Props) => (
  <View>
    <Text className="mb-2 text-sm font-medium text-gray-700">Status</Text>
    <View className="flex-row flex-wrap gap-2">
      {RECIPE_STATUS_OPTIONS.map(status => {
        const selected = value === status;
        return (
          <Pressable
            key={status}
            accessibilityRole="button"
            accessibilityState={{selected, disabled}}
            disabled={disabled}
            className={clsx(
              'rounded-full border px-3 py-2',
              selected
                ? 'border-primary bg-primary/10'
                : 'border-gray-200 bg-white',
              disabled && 'opacity-50',
            )}
            onPress={() => {
              onChange(status);
            }}
          >
            <Text
              className={clsx(
                'text-sm font-medium',
                selected ? 'text-primary' : 'text-gray-700',
              )}
            >
              {RECIPE_STATUS_LABELS[status]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

if (__DEV__) {
  const RecipeStatusPickerDemo = () => {
    const [status, setStatus] = useState<RecipeStatus>('evolving');

    return (
      <RecipeStatusPicker
        value={status}
        onChange={setStatus}
      />
    );
  };

  RecipeStatusPicker.demo = () => <RecipeStatusPickerDemo />;
}
