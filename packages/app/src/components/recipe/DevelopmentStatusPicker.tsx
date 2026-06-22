import {
  RECIPE_DEVELOPMENT_STATUS_LABELS,
  RECIPE_DEVELOPMENT_STATUS_OPTIONS,
} from '@eciperay/client';
import type {RecipeDevelopmentStatus} from '@eciperay/types';
import clsx from 'clsx';
import React from 'react';
import {Pressable, Text, View} from 'react-native';

type Props = {
  value: RecipeDevelopmentStatus;
  onChange: (status: RecipeDevelopmentStatus) => void;
  disabled?: boolean;
};

export const DevelopmentStatusPicker = ({
  value,
  onChange,
  disabled = false,
}: Props) => (
  <View>
    <Text className="mb-2 text-sm font-medium text-gray-700">
      Development status
    </Text>
    <View className="flex-row flex-wrap gap-2">
      {RECIPE_DEVELOPMENT_STATUS_OPTIONS.map(status => {
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
              {RECIPE_DEVELOPMENT_STATUS_LABELS[status]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);
