import clsx from 'clsx';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {CookLogInput} from '@eciperay/types';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
};

export const CookLogForm = ({onSubmit, onSkip, isPending}: Props) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <View className="w-full rounded-2xl bg-white/10 p-6">
      <Text className="mb-4 text-xl font-semibold text-white">
        How did it go?
      </Text>
      <View className="mb-4 flex-row justify-center gap-2">
        {STAR_RATINGS.map(star => (
          <TouchableOpacity
            key={star}
            accessibilityLabel={`${star} stars`}
            onPress={() => {
              setRating(star);
            }}
          >
            <Text
              className={clsx('text-2xl', {
                'text-yellow-400': rating !== null && star <= rating,
                'text-white/30': rating === null || star > rating,
              })}
            >
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-base text-white"
        placeholder="Notes from this cook (optional)"
        placeholderTextColor="rgba(255,255,255,0.5)"
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 items-center rounded-xl bg-white/10 py-3"
          onPress={onSkip}
        >
          <Text className="text-base text-white">Skip</Text>
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
