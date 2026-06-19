import type {RecipeLifecycleStatus} from '@eciperay/types';
import clsx from 'clsx';
import React from 'react';
import {Text, View} from 'react-native';

const STATUS_LABELS: Record<RecipeLifecycleStatus, string> = {
  idea: 'Idea',
  evolving: 'Evolving',
  perfected: 'Perfected',
  abandoned: 'Abandoned',
};

const STATUS_STYLES: Record<RecipeLifecycleStatus, string> = {
  idea: 'bg-gray-100 text-gray-700',
  evolving: 'bg-blue-100 text-blue-800',
  perfected: 'bg-green-100 text-green-800',
  abandoned: 'bg-red-100 text-red-700',
};

type Props = {status: RecipeLifecycleStatus};

export const LifecycleStatusBadge = ({status}: Props) => (
  <View
    className={clsx(
      'rounded-full px-2.5 py-0.5',
      STATUS_STYLES[status].split(' ')[0],
    )}
  >
    <Text
      className={clsx(
        'text-xs font-medium',
        STATUS_STYLES[status].split(' ').slice(1).join(''),
        status === 'abandoned' ? 'line-through' : '',
      )}
    >
      {STATUS_LABELS[status]}
    </Text>
  </View>
);
