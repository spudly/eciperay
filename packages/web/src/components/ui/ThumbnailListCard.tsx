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

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
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
      <YStack
        flex={1}
        gap="$1"
      >
        <DSText variant="subheading">{title}</DSText>
        {subtitle ? <DSText variant="hint">{subtitle}</DSText> : null}
      </YStack>
    </XStack>
  );

  // The press target wraps only the main content (thumbnail + title).
  // Trailing actions (e.g. "Log cook", "Delete" buttons) are not inside the
  // pressable (avoiding nested interactive elements), but they ARE inside
  // the card surface: the card wraps a row holding the pressable main
  // region and the actions. Rendering the actions as siblings outside the
  // card made them float in the page margin, detached from the card border
  // (#258). The app mirror renders its trailing actions inside the card the
  // same way.
  //
  // Both press branches show a pointer cursor on hover (#213) so the card
  // reads as clickable: the onPress Card takes Tamagui's cursor style prop
  // (the same mechanism the design system's own pressables use), and the
  // linkTo Link carries it in its inline style. The app mirror has no
  // counterpart — native has no hover cursor.
  //
  // Inside the trailing-actions row the main region flexes from a 17rem
  // basis and the row wraps (#190): at phone widths the trailing actions cannot
  // share the row without squeezing the title column to a few characters,
  // so they wrap onto their own right-aligned row and the card spans the
  // full list width. The basis is sized so that whenever the actions DO
  // stay beside the card, the title column keeps at least ~160px (17rem
  // minus the card padding, the 64px thumbnail, and the gap) — a smaller
  // basis let the actions rejoin at 414–430px viewports with a ~118px
  // title column. At desktop widths everything fits on one row and
  // nothing wraps. (The app mirror keeps its single-row layout: native
  // rows are not width-squeezed the same way, and its trailing actions
  // render inside the card.)
  //
  // The basis applies ONLY in that row: without trailing actions the
  // card renders standalone as a child of a column layout, where a
  // 17rem flex basis would resolve vertically and stretch the card.
  const inRow = Boolean(trailing);
  let card: ReactNode;
  if (onPress) {
    card = inRow ? (
      <DSCard
        onPress={onPress}
        role="button"
        tabIndex={0}
        cursor="pointer"
        flexGrow={1}
        flexShrink={1}
        flexBasis="17rem"
        minWidth={0}
      >
        {main}
      </DSCard>
    ) : (
      <DSCard
        onPress={onPress}
        role="button"
        tabIndex={0}
        cursor="pointer"
        flex={1}
      >
        {main}
      </DSCard>
    );
  } else if (linkTo) {
    card = (
      <Link
        to={linkTo}
        style={{
          textDecoration: 'none',
          display: 'block',
          cursor: 'pointer',
          flex: inRow ? '1 1 17rem' : 1,
          minWidth: 0,
        }}
      >
        <DSCard>{main}</DSCard>
      </Link>
    );
  } else {
    card = inRow ? (
      <DSCard
        flexGrow={1}
        flexShrink={1}
        flexBasis="17rem"
        minWidth={0}
      >
        {main}
      </DSCard>
    ) : (
      <DSCard flex={1}>{main}</DSCard>
    );
  }

  if (!trailing) {
    return card;
  }

  // With trailing actions, the card surface wraps the whole row: the
  // pressable main region flexes from the same 17rem basis as the
  // standalone card did, and the actions row still wraps onto its own
  // right-aligned row at phone widths (#190) — now inside the card.
  // The main region is a YStack (column), not an XStack: as a column
  // container its child row is width-capped by stretch, exactly as when
  // the card itself wrapped the row. An XStack region made the row a
  // flex item whose min-content (thumbnail + unwrapped subtitle) forced
  // it wider than the card at phone widths — a 9px horizontal overflow
  // on /recipes at 390px in the mobile-web e2e layout test.
  // The outer card renders with padding 0 and the main region carries
  // the card's padding itself, so the padded area stays inside the
  // press target: when the pressable was a plain stack under the padded
  // card, clicks on the card's padded ring hit the outer card and never
  // reached onPress. The actions wrapper keeps the card's end and
  // bottom insets instead. (With border-box sizing the main region's
  // 17rem basis already included this padding back when the pressable
  // was a Card, so the row's outer geometry is unchanged.)
  let mainRegion: ReactNode;
  if (onPress) {
    mainRegion = (
      <YStack
        onPress={onPress}
        role="button"
        tabIndex={0}
        cursor="pointer"
        flexGrow={1}
        flexShrink={1}
        flexBasis="17rem"
        minWidth={0}
        padding="$4"
      >
        {main}
      </YStack>
    );
  } else if (linkTo) {
    mainRegion = (
      <Link
        to={linkTo}
        style={{
          textDecoration: 'none',
          display: 'block',
          cursor: 'pointer',
          flex: '1 1 17rem',
          minWidth: 0,
          paddingTop: tokens.spacing[4],
          paddingBottom: tokens.spacing[4],
          paddingLeft: tokens.spacing[4],
          paddingRight: tokens.spacing[4],
        }}
      >
        {main}
      </Link>
    );
  } else {
    mainRegion = (
      <YStack
        flexGrow={1}
        flexShrink={1}
        flexBasis="17rem"
        minWidth={0}
        padding="$4"
      >
        {main}
      </YStack>
    );
  }

  return (
    <DSCard padding={0}>
      <XStack
        gap="$3"
        alignItems="center"
        flexWrap="wrap"
      >
        {mainRegion}
        <div
          style={{
            marginInlineStart: 'auto',
            paddingTop: tokens.spacing[4],
            paddingBottom: tokens.spacing[4],
            paddingInlineEnd: tokens.spacing[4],
          }}
        >
          {trailing}
        </div>
      </XStack>
    </DSCard>
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
