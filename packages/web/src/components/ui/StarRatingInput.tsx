import type {StarRatingInputProps} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';
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

  // Style objects on DS tokens (B7 C12, design-system#130).
  const starStyle = (star: number): CSSProperties => ({
    fontSize: tokens.typography.fontSize['2xl'],
    lineHeight: 1,
    color:
      value !== null && star <= value
        ? tokens.colors.warning.warning4
        : tone === 'dark'
          ? 'rgb(255 255 255 / 0.3)'
          : tokens.colors.gray.gray4,
  });

  const starButtonStyle = (star: number): CSSProperties => ({
    ...starStyle(star),
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  });

  return (
    <div style={{display: 'flex', gap: tokens.spacing[2]}}>
      {stars.map(star => {
        if (readOnly || !onChange) {
          return (
            <span
              key={star}
              aria-label={`${star} stars`}
              style={starStyle(star)}
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
            style={starButtonStyle(star)}
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
