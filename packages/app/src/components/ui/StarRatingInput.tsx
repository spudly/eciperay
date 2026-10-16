import type {StarRatingInputProps} from '@eciperay/client';
import {StarRatingInput as DsStarRatingInput} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'tamagui';

/**
 * Adapter notes: the DS StarRatingInput is fixed at 5 stars (the eciperay `max`
 * default is 5; non-5 values have no DS equivalent) and has no `tone` prop, so
 * both are accepted by the prop API but not forwarded. The toggle-off behavior
 * (pressing the current star clears the rating) is preserved, as are
 * `readOnly`/`disabled` via a non-interactive wrapper.
 */
export const StarRatingInput = ({
  value,
  onChange,
  readOnly = false,
  disabled = false,
}: StarRatingInputProps) => {
  const interactive = !readOnly && !disabled && onChange !== undefined;

  const handleChange = (star: number) => {
    if (disabled || !onChange) {
      return;
    }
    onChange(value === star ? null : star);
  };

  return (
    <View
      pointerEvents={interactive ? 'auto' : 'none'}
      opacity={disabled ? 0.5 : undefined}
      accessibilityState={{disabled}}
    >
      <DsStarRatingInput
        value={value ?? 0}
        onChange={handleChange}
      />
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
