import type {RecipeDetail} from '@eciperay/types';
import {formatRecipeListSubtitle, makeRecipeDetail} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import type {ComponentType} from 'react';
import type {ShowcaseFrameProps} from '@eciperay/client';
import {Link} from 'react-router-dom';
import {Text, XStack, YStack} from 'tamagui';

// Parity note (#278): the card subtitle is formatted by the shared
// formatRecipeListSubtitle in @eciperay/client — the per-mirror local
// copies are gone, so the servings pluralization and satiety label are
// defined once for both mirrors and the app's DS-page hosts.

// The thumbnail list card this file used to take from the host
// components/ui wrapper library (itself an adapter over the design
// system's Card + Text, both gone in @spudly/ui 6.x), re-expressed
// in-file with tamagui primitives for this card's one configuration —
// a link-only row: a surface card (the DS Card's default treatment —
// surface fill, 1px border, large radius, 16px padding) holding a
// 64px thumbnail and a title/subtitle text block, wrapped in the
// router link. The link shows a pointer cursor on hover (#213) so
// the card reads as clickable.
const SharedThumbnailListCard = ({
  imageUrl,
  title,
  subtitle,
  linkTo,
}: {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  linkTo: string;
}) => (
  <Link
    to={linkTo}
    style={{
      textDecoration: 'none',
      display: 'block',
      cursor: 'pointer',
      flex: 1,
      minWidth: 0,
    }}
  >
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
    >
      <XStack
        gap="$3"
        alignItems="center"
      >
        {imageUrl ? (
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
        )}
        <YStack
          flex={1}
          gap="$1"
        >
          <Text
            fontSize={tokens.typography.fontSize.xl}
            fontWeight={tokens.typography.fontWeight.semibold}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color="$textMuted"
            >
              {subtitle}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  </Link>
);

type SharedRecipeListCardProps = {recipe: RecipeDetail};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const SharedRecipeListCard = ({recipe}: SharedRecipeListCardProps) => (
  <SharedThumbnailListCard
    imageUrl={recipe.imageUrl}
    title={recipe.title}
    subtitle={formatRecipeListSubtitle(recipe)}
    linkTo={`/recipe/${recipe.id}/${recipe.slug}`}
  />
);

if (import.meta.env.DEV) {
  SharedRecipeListCard.demo = function SharedRecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <SharedRecipeListCard recipe={mockRecipe} />
      </Frame>
    );
  };
}
