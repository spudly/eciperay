import {
  buildRecipePath,
  formatRecipeListSubtitle,
  invalidateRecipeQueries,
  makeRecipeDetail,
  type ShowcaseFrameProps,
} from '@eciperay/client';
import type {CookLogInput, RecipeDetail} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {Link} from 'react-router-dom';
import {Text, XStack, YStack} from 'tamagui';

import {eciperay} from '../lib/api.js';

import {CookLogForm} from './cooking/CookLogForm.js';

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency; the design
// system Button has no gray-filled or danger-tint variant for these
// in-card actions, so the trailing slot keeps plain buttons).
const cardActionStyle: CSSProperties = {
  borderRadius: 8,
  border: 'none',
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 4,
  paddingBottom: 4,
  fontSize: 14,
  fontFamily: tokens.typography.fontFamily.sans,
  cursor: 'pointer',
};

// The thumbnail list card this file used to take from the host
// components/ui wrapper library (itself an adapter over the design
// system's Card + Text, both gone in @spudly/ui 6.x), re-expressed
// in-file with tamagui primitives: a surface card (the DS Card's
// default treatment — surface fill, 1px border, large radius, 16px
// padding) holding a 64px thumbnail and a title/subtitle text block,
// with the same press/link/trailing geometry the wrapper carried
// (see the #190 / #258 notes inline below).
type ThumbnailListCardProps = {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  linkTo?: string;
  trailing?: ReactNode;
};

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

const cardSurfaceProps = {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: tokens.radii.lg,
  padding: tokens.spacing[4],
} as const;

const ThumbnailListCard = ({
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
  // reads as clickable: the onPress card takes Tamagui's cursor style prop
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
      <YStack
        {...cardSurfaceProps}
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
      </YStack>
    ) : (
      <YStack
        {...cardSurfaceProps}
        onPress={onPress}
        role="button"
        tabIndex={0}
        cursor="pointer"
        flex={1}
      >
        {main}
      </YStack>
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
        <YStack {...cardSurfaceProps}>{main}</YStack>
      </Link>
    );
  } else {
    card = inRow ? (
      <YStack
        {...cardSurfaceProps}
        flexGrow={1}
        flexShrink={1}
        flexBasis="17rem"
        minWidth={0}
      >
        {main}
      </YStack>
    ) : (
      <YStack
        {...cardSurfaceProps}
        flex={1}
      >
        {main}
      </YStack>
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
    <YStack
      {...cardSurfaceProps}
      padding={0}
    >
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
    </YStack>
  );
};

// Parity note (#278): the card subtitle is formatted by the shared
// formatRecipeListSubtitle in @eciperay/client — the per-mirror local
// copies are gone, so the servings pluralization and satiety label are
// defined once for both mirrors and the app's DS-page hosts.
// Parity note (design-system#126): both mirrors rendered the design
// system's rating form for the inline cook log — the app mirror adopted
// it with the design-system pages, and this mirror adopted it in B7
// cluster C6 (design-system#130), when the web home list retired into
// the design system HomePage. The form shipped as CookLogForm until
// @spudly/ui 1.15.0 generalized it into RatingForm
// (design-system#176); in @spudly/ui 6.x RatingForm is gone, so this
// card renders the host's own cooking/CookLogForm — the web form that
// predates the DS one — whose submit values are already a CookLogInput.

type RecipeListCardProps = {
  recipe: RecipeDetail;
  onDelete: (id: string) => void;
  onPress?: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const RecipeListCard = ({
  recipe,
  onDelete,
  onPress,
  isDeleting = false,
  deleteError,
}: RecipeListCardProps) => {
  const [showForm, setShowForm] = useState(false);
  // Deletion is confirmed in-page, not with window.confirm (#263): the
  // native dialog is suppressed in some browsers/webviews, which made
  // Delete a silent no-op — the click never reached onDelete and no
  // error was shown. Meal, meal-plan, and tag deletes never had that
  // gate. The two-step inline confirm mirrors the app's destructive
  // Alert (Cancel / Delete) while staying renderable everywhere.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipe.id, recipe.versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);
      setShowForm(false);
    },
  });

  return (
    <div>
      <ThumbnailListCard
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        subtitle={formatRecipeListSubtitle(recipe)}
        onPress={onPress}
        linkTo={onPress ? undefined : buildRecipePath(recipe)}
        trailing={
          <div
            style={{
              marginLeft: tokens.spacing[3],
              display: 'flex',
              flexShrink: 0,
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            {showForm ? null : confirmingDelete ? (
              <>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.danger.danger7,
                    color: '#ffffff',
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                  disabled={isDeleting}
                  onClick={() => {
                    onDelete(recipe.id);
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.gray.gray2,
                    color: tokens.colors.gray.gray8,
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                  disabled={isDeleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.gray.gray2,
                    color: tokens.colors.gray.gray8,
                  }}
                  onClick={() => {
                    setShowForm(true);
                  }}
                >
                  Log cook
                </button>
                <button
                  type="button"
                  style={{
                    ...cardActionStyle,
                    backgroundColor: tokens.colors.danger.danger1,
                    color: tokens.colors.danger.danger7,
                  }}
                  onClick={() => {
                    setConfirmingDelete(true);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        }
      />
      {deleteError ? (
        <p
          role="alert"
          style={{
            margin: 0,
            marginBottom: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.danger.danger7,
          }}
        >
          {deleteError}
        </p>
      ) : null}
      {showForm ? (
        <div style={{marginBottom: tokens.spacing[3]}}>
          <CookLogForm
            variant="light"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={input => {
              createMutation.mutate(input);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  RecipeListCard.demo = function RecipeListCardDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    const mockRecipe = makeRecipeDetail();

    return (
      <Frame>
        <RecipeListCard
          recipe={mockRecipe}
          onDelete={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
}
