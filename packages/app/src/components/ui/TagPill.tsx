import type {TagPillProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {XStack} from 'tamagui';

/**
 * Tag pill tinted by the tag's own color (a data prop, not a theme value): the
 * pill surface is the color at low alpha and the label is the color itself —
 * the old ui-tag-pill shape (full radius, px-3 py-1, sm medium text) with DS
 * token geometry.
 */
export const TagPill = ({name, color}: TagPillProps) => (
  <XStack
    borderRadius={tokens.radii.full}
    paddingHorizontal="$3"
    paddingVertical="$1"
    backgroundColor={`${color}22`}
  >
    <DsText
      fontSize={tokens.typography.fontSize.sm}
      fontWeight={tokens.typography.fontWeight.medium}
      color={color}
    >
      {name}
    </DsText>
  </XStack>
);

if (__DEV__) {
  TagPill.demo = () => (
    <TagPill
      name="Weeknight"
      color="#6366f1"
    />
  );
}
