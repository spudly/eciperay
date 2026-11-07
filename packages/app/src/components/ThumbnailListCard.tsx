import type {ThumbnailListCardProps} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {TouchableOpacity} from 'react-native';
import {Image, Text, View, XStack} from 'tamagui';

/**
 * G8 (ThumbnailListCard): an app-domain list-row composite in the adapter layer
 * — thumbnail + title/meta text on an elevated card surface. It lived in the
 * app components/ui wrapper library until @spudly/ui 6.x (pages-only exports)
 * retired the DS Card / Text it composed; it now re-expresses that composition
 * host-side with tamagui primitives and @spudly/ui tokens: the elevated card is
 * the $surface fill with the md shadow token and lg radius, the title is
 * semibold body text, the subtitle is the hint treatment (sm, muted ink). The
 * 64px thumbnail (old block-16/inline-16) is the $16 size token; rounded-lg is
 * the md radius token.
 *
 * Parity note (#190): the web mirror wraps its trailing actions onto their own
 * row at phone widths because the browser squeezed the title column beside them
 * (its 17rem card basis applies only in that row — standalone web cards render
 * in a column layout, where the basis would resolve vertically); native rows
 * here keep the single-row layout with the trailing actions inside the card,
 * which does not squeeze the same way.
 *
 * Parity note (#213): the web mirror's press targets (its onPress Card and
 * linkTo Link) show a pointer cursor on hover so the card reads as clickable.
 * Native has no hover cursor, so there is no counterpart here. Comment-only; no
 * behavior change.
 *
 * Parity note (#267): the web mirror moved its card padding inside the press
 * target — the web card itself is pressable, but its padding sat on the outer
 * card while onPress lived on an inner stack, so the padded ring never pressed.
 * This mirror's card is not a pressable surface: its press targets are the
 * thumbnail and text TouchableOpacities, and the card's padding is layout space
 * around them, so there is no counterpart change. Comment-only; no behavior
 * change.
 */

// Structural flex only (the old flex-1 min-inline-0): the text block
// expands and may shrink within the card row. No visual values.
const textBlockStyle = {flex: 1, minWidth: 0};
const Thumbnail = ({imageUrl}: {imageUrl?: string | null}) =>
  imageUrl ? (
    <Image
      src={imageUrl}
      width="$16"
      height="$16"
      borderRadius={tokens.radii.md}
      backgroundColor={tokens.colors.gray.gray1}
      objectFit="cover"
    />
  ) : (
    <View
      width="$16"
      height="$16"
      borderRadius={tokens.radii.md}
      backgroundColor={tokens.colors.gray.gray2}
    />
  );

export const ThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  onPress,
  trailing,
}: ThumbnailListCardProps) => (
  <XStack
    backgroundColor="$surface"
    borderRadius={tokens.radii.lg}
    padding={tokens.spacing[4]}
    shadowColor={tokens.shadows.md.shadowColor}
    shadowOffset={tokens.shadows.md.shadowOffset}
    shadowOpacity={tokens.shadows.md.shadowOpacity}
    shadowRadius={tokens.shadows.md.shadowRadius}
    alignItems="center"
    gap="$3"
    marginBottom="$3"
  >
    <TouchableOpacity onPress={onPress}>
      <Thumbnail imageUrl={imageUrl} />
    </TouchableOpacity>
    <TouchableOpacity
      style={textBlockStyle}
      onPress={onPress}
    >
      <Text fontWeight={tokens.typography.fontWeight.semibold}>{title}</Text>
      {subtitle ? (
        <Text
          fontSize={tokens.typography.fontSize.sm}
          color="$textMuted"
          marginTop="$1"
        >
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
    {trailing}
  </XStack>
);
