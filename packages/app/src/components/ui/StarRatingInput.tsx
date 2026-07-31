import type {StarRatingInputProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

export const StarRatingInput = ({
  value,
  onChange,
  max = 5,
  readOnly = false,
  disabled = false,
  tone = 'default',
}: StarRatingInputProps) => {
  const stars = Array.from({length: max}, (_, index) => index + 1);

  const starClass = (star: number) =>
    clsx('text-2xl', {
      'text-yellow-400': value !== null && star <= value,
      'text-gray-300': tone !== 'dark' && (value === null || star > value),
      'text-white/30': tone === 'dark' && (value === null || star > value),
    });

  return (
    <View className="ui-star-rating flex-row">
      {stars.map(star => {
        if (readOnly || !onChange) {
          return (
            <Text
              key={star}
              accessibilityLabel={`${star} stars`}
              className={starClass(star)}
            >
              ★
            </Text>
          );
        }
        return (
          <Pressable
            key={star}
            accessibilityLabel={`${star} stars`}
            disabled={disabled}
            onPress={() => {
              onChange(value === star ? null : star);
            }}
          >
            <Text className={starClass(star)}>★</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

if (__DEV__) {
  const StarRatingInputDemo = () => {
    const [value, setValue] = useState<number | null>(3);

    return (
      <StarRatingInput
        value={value}
        onChange={setValue}
      />
    );
  };

  StarRatingInput.demo = () => <StarRatingInputDemo />;
}
