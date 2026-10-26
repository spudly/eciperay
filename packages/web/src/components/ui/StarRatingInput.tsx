import type {StarRatingInputProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

// Parity note (design-system#126): the app no longer mirrors this
// input — the app renders the design system CookLogForm, whose
// rating uses the design system StarRatingInput directly — and this
// web implementation remains until web adoption in B7.
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
    <div className="flex gap-2">
      {stars.map(star => {
        if (readOnly || !onChange) {
          return (
            <span
              key={star}
              aria-label={`${star} stars`}
              className={starClass(star)}
            >
              ★
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars`}
            className={starClass(star)}
            disabled={disabled}
            onClick={() => {
              onChange(value === star ? null : star);
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

if (import.meta.env.DEV) {
  StarRatingInput.demo = function StarRatingInputDemo() {
    const [value, setValue] = useState<number | null>(3);

    return (
      <StarRatingInput
        value={value}
        onChange={setValue}
      />
    );
  };
}
