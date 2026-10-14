import clsx from 'clsx';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {CookLogInput} from '@eciperay/types';

import {StarRatingInput} from '../ui/StarRatingInput';

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
  variant?: 'dark' | 'light';
  secondaryLabel?: string;
};

export const CookLogForm = ({
  onSubmit,
  onSkip,
  isPending,
  variant = 'dark',
  secondaryLabel = 'Skip',
}: Props) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const isLight = variant === 'light';

  return (
    <View
      className={clsx('rounded-2xl p-6 inline-full', {
        'bg-white/10': !isLight,
        'border border-gray-200 bg-gray-50': isLight,
      })}
    >
      <Text
        className={clsx('mbe-4 text-xl font-semibold', {
          'text-white': !isLight,
          'text-gray-900': isLight,
        })}
      >
        How did it go?
      </Text>
      <View className="mbe-4 items-center">
        <StarRatingInput
          value={rating}
          tone={isLight ? 'default' : 'dark'}
          onChange={star => {
            setRating(star as 1 | 2 | 3 | 4 | 5 | null);
          }}
        />
      </View>
      <TextInput
        className={clsx(
          'mbe-4 rounded-xl px-4 py-3 text-base',
          isLight
            ? 'border border-gray-300 bg-white text-gray-900'
            : 'bg-white/10 text-white',
        )}
        placeholder="Notes from this cook (optional)"
        placeholderTextColor={isLight ? '#9ca3af' : 'rgba(255,255,255,0.5)'}
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      <View className="flex-row gap-3">
        <TouchableOpacity
          className={clsx('flex-1 items-center rounded-xl py-3', {
            'bg-white/10': !isLight,
            'border border-gray-200 bg-white': isLight,
          })}
          onPress={onSkip}
        >
          <Text
            className={clsx('text-base', {
              'text-white': !isLight,
              'text-gray-700': isLight,
            })}
          >
            {secondaryLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={clsx(
            'bg-primary flex-1 items-center rounded-xl py-3',
            isPending ? 'opacity-50' : '',
          )}
          disabled={isPending}
          onPress={() => {
            onSubmit({authorStarRating: rating, notes: notes.trim() || null});
          }}
        >
          <Text className="text-base font-semibold text-white">Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

if (__DEV__) {
  CookLogForm.demo = () => (
    <CookLogForm
      onSubmit={() => {
        void 0;
      }}
      onSkip={() => {
        void 0;
      }}
      isPending={false}
      variant="light"
    />
  );
}
