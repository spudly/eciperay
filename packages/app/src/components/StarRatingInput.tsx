import type {StarRatingInputProps} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {Text, XStack, YStack} from 'tamagui';

/**
 * The app's host star-rating input: @spudly/ui 6.x exports pages only, so the
 * DS StarRatingInput widget no longer crosses the package boundary and the
 * input lives host-side. It mirrors the web host's StarRatingInput logic
 * (packages/web) — same props shape from @eciperay/client, same toggle-off
 * press (pressing the current star clears the rating to null), same filled /
 * unfilled token colors — re-expressed with tamagui primitives for React
 * Native, with the DS input's accessibility contract: a radiogroup of radio
 * stars, each named "Rate {star} out of {max} stars" and checked when filled,
 * on ≥44dp touch targets. `readOnly` (or a missing onChange) renders the static
 * display. No lineHeight is set on the glyphs (the #162 containment rule).
 */
export const StarRatingInput = ({
  value,
  onChange,
  max = 5,
  readOnly = false,
  disabled = false,
  tone = 'default',
}: StarRatingInputProps) => {
  const stars = Array.from({length: max}, (_, index) => index + 1);

  const starColor = (star: number) => {
    if (value !== null && star <= value) {
      return {color: tokens.colors.warning.warning4, opacity: 1};
    }
    return tone === 'dark'
      ? {color: tokens.colors.gray.gray1, opacity: 0.3}
      : {color: tokens.colors.gray.gray4, opacity: 1};
  };

  if (readOnly || !onChange) {
    return (
      <XStack
        gap={tokens.spacing[2]}
        accessibilityRole="image"
        accessibilityLabel={`Rated ${value ?? 0} out of ${max} stars`}
      >
        {stars.map(star => {
          const style = starColor(star);
          return (
            <YStack
              key={star}
              minWidth={44}
              minHeight={44}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                style={{
                  fontSize: tokens.typography.fontSize['2xl'],
                  color: style.color,
                  opacity: style.opacity,
                }}
              >
                ★
              </Text>
            </YStack>
          );
        })}
      </XStack>
    );
  }

  return (
    <XStack
      gap={tokens.spacing[2]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Star rating"
      opacity={disabled ? 0.5 : 1}
    >
      {stars.map(star => {
        const style = starColor(star);
        const selected = value !== null && star <= value;
        return (
          <YStack
            key={star}
            minWidth={44}
            minHeight={44}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            accessibilityRole="radio"
            accessibilityLabel={`Rate ${star} out of ${max} stars`}
            accessibilityState={{checked: selected, disabled}}
            onPress={() => {
              if (disabled) {
                return;
              }
              onChange(value === star ? null : star);
            }}
          >
            <Text
              style={{
                fontSize: tokens.typography.fontSize['2xl'],
                color: style.color,
                opacity: style.opacity,
              }}
            >
              ★
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
};
