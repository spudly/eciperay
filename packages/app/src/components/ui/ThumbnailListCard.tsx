import type {ThumbnailListCardProps} from '@eciperay/client';
import {Card, Text as DsText, tokens} from '@spudly/ui';
import {TouchableOpacity} from 'react-native';
import {Image, View} from 'tamagui';

/**
 * G8 (ThumbnailListCard): an app-domain list-row composite that stays in the
 * adapter layer — DS Card + thumbnail + title/meta text composed from DS
 * components and token props. The 64px thumbnail (old block-16/inline-16) is
 * the $16 size token; rounded-lg is the md radius token.
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
  <Card
    variant="elevated"
    flexDirection="row"
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
      <DsText fontWeight={tokens.typography.fontWeight.semibold}>
        {title}
      </DsText>
      {subtitle ? (
        <DsText
          variant="hint"
          marginTop="$1"
        >
          {subtitle}
        </DsText>
      ) : null}
    </TouchableOpacity>
    {trailing}
  </Card>
);
