import type {ThumbnailListCardProps} from '@eciperay/client';
import {Card as DSCard, Text as DSText, tokens} from '@spudly/ui';
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {XStack, YStack} from 'tamagui';

const Thumbnail = ({
  imageUrl,
  title,
}: {
  imageUrl?: string | null;
  title: string;
}) =>
  imageUrl ? (
    <img
      src={imageUrl}
      alt={title}
      width={64}
      height={64}
      style={{
        flexShrink: 0,
        borderRadius: tokens.radii.md,
        objectFit: 'cover',
        backgroundColor: tokens.colors.gray.gray2,
      }}
    />
  ) : (
    <div
      aria-hidden
      style={{
        width: 64,
        height: 64,
        flexShrink: 0,
        borderRadius: tokens.radii.md,
        backgroundColor: tokens.colors.gray.gray2,
      }}
    />
  );

export const ThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  onPress,
  trailing,
  linkTo,
}: ThumbnailListCardProps) => {
  const main = (
    <XStack
      gap="$3"
      alignItems="center"
    >
      <Thumbnail
        imageUrl={imageUrl}
        title={title}
      />
      <YStack flex={1} gap="$1">
        <DSText variant="subheading">{title}</DSText>
        {subtitle ? <DSText variant="hint">{subtitle}</DSText> : null}
      </YStack>
    </XStack>
  );

  // The press target wraps only the main content (thumbnail + title).
  // Trailing actions (e.g. "Log cook", "Delete" buttons) render as siblings
  // OUTSIDE the pressable, avoiding nested interactive elements.
  let card: ReactNode;
  if (onPress) {
    card = (
      <DSCard
        onPress={onPress}
        role="button"
        tabIndex={0}
        flex={1}
      >
        {main}
      </DSCard>
    );
  } else if (linkTo) {
    card = (
      <Link
        to={linkTo}
        style={{textDecoration: 'none', display: 'block', flex: 1}}
      >
        <DSCard>{main}</DSCard>
      </Link>
    );
  } else {
    card = <DSCard flex={1}>{main}</DSCard>;
  }

  if (!trailing) {
    return card;
  }

  return (
    <XStack gap="$3" alignItems="center">
      {card}
      {trailing}
    </XStack>
  );
};

if (import.meta.env.DEV) {
  ThumbnailListCard.demo = function ThumbnailListCardDemo() {
    return (
      <ThumbnailListCard
        title="Test Recipe"
        subtitle="4 servings"
        linkTo="/recipes/1"
      />
    );
  };
}
