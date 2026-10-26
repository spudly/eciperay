/* eslint-disable max-lines -- sharing controls include consent and link actions */
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  makeRecipeDetail,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {
  Button as DsButton,
  Card as DsCard,
  RadioOptionGroup as DsRadioOptionGroup,
  Text as DsText,
  TextLink as DsTextLink,
  tokens,
} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Linking, Share} from 'react-native';
import {YStack} from 'tamagui';

import {api} from '../../lib/api';
import {CheckboxField} from '../../components/ui/CheckboxField';

type Props = {recipe: RecipeDetail; onActionMessage: (message: string) => void};

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

/**
 * The secondary actions (rotate/share) keep their old outline-neutral look — a
 * transparent fill with a hairline border and gray label — expressed as token
 * overrides on the DS secondary Button.
 */
const OutlineActionButton = ({
  label,
  disabled = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <DsButton
    variant="secondary"
    size="sm"
    backgroundColor="transparent"
    borderWidth={1}
    borderColor="$borderColor"
    color={tokens.colors.gray.gray7}
    disabled={disabled}
    onPress={onPress}
  >
    {label}
  </DsButton>
);

export const RecipeVisibilityControls = ({recipe, onActionMessage}: Props) => {
  const queryClient = useQueryClient();
  const [pendingVisibility, setPendingVisibility] =
    useState<RecipeVisibility | null>(null);
  const [publishingConsent, setPublishingConsent] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [activeVisibility, setActiveVisibility] = useState(recipe.visibility);

  useEffect(() => {
    setActiveVisibility(recipe.visibility);
  }, [recipe.visibility]);

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const sharingMutation = useMutation({
    mutationFn: (input: {
      visibility: RecipeVisibility;
      publishingConsent?: boolean;
    }) => api.recipes.patchSharing(recipe.id, input),
    onSuccess: result => {
      setActiveVisibility(result.visibility);
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      setPendingVisibility(null);
      setPublishingConsent(false);
      void invalidate();
      onActionMessage('Sharing settings updated');
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => api.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      setShareToken(result.shareToken ?? null);
      void invalidate();
      onActionMessage('Share link rotated');
    },
  });

  const permalink = buildRecipePermalink(WEB_APP_BASE_URL, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(WEB_APP_BASE_URL, recipe, shareToken)
      : activeVisibility === 'public'
        ? permalink
        : null;

  return (
    <DsCard
      variant="bordered"
      marginBlockEnd="$4"
    >
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.semibold}
        marginBlockEnd="$2"
      >
        Sharing
      </DsText>
      <DsRadioOptionGroup
        id={`visibility-${recipe.id}`}
        value={pendingVisibility ?? recipe.visibility}
        disabled={sharingMutation.isPending}
        options={visibilityOptions.map(option => ({
          value: option,
          label: recipeVisibilityLabels[option],
          description: recipeVisibilityDescriptions[option],
        }))}
        onValueChange={value => {
          setPendingVisibility(value as RecipeVisibility);
        }}
      />
      {pendingVisibility === 'public' ? (
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          color={tokens.colors.warning.warning9}
          marginBlockStart="$2"
        >
          This recipe will be discoverable by anyone browsing Eciperay.
        </DsText>
      ) : null}
      {pendingVisibility &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) ? (
        <CheckboxField
          checked={publishingConsent}
          onChange={setPublishingConsent}
          label="Publishing consent"
          description={
            <>
              I understand this recipe may be viewed without signing in and I
              agree to the{' '}
              <DsTextLink
                fontSize={tokens.typography.fontSize.sm}
                onPress={() => {
                  void Linking.openURL(PRIVACY_POLICY_URL);
                }}
              >
                Privacy Policy
              </DsTextLink>
              .
            </>
          }
        />
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <YStack marginBlockStart="$3">
          <DsButton
            variant="primary"
            accessibilityLabel="Save sharing settings"
            disabled={
              sharingMutation.isPending ||
              (requiresPublishingConsent(
                recipe.visibility,
                pendingVisibility,
              ) &&
                !publishingConsent)
            }
            onPress={() => {
              sharingMutation.mutate({
                visibility: pendingVisibility,
                ...(requiresPublishingConsent(
                  recipe.visibility,
                  pendingVisibility,
                )
                  ? {publishingConsent: true}
                  : {}),
              });
            }}
          >
            Save sharing settings
          </DsButton>
        </YStack>
      ) : null}
      {activeVisibility === 'unlisted' ? (
        <YStack
          marginBlockStart="$3"
          gap="$2"
        >
          <OutlineActionButton
            label={shareToken ? 'Rotate share link' : 'Generate share link'}
            disabled={rotateMutation.isPending}
            onPress={() => {
              rotateMutation.mutate();
            }}
          />
          {shareUrl ? (
            <OutlineActionButton
              label="Share link"
              onPress={() => {
                void Share.share({message: shareUrl});
              }}
            />
          ) : null}
        </YStack>
      ) : null}
      {activeVisibility === 'public' ? (
        <YStack marginBlockStart="$3">
          <DsText
            fontSize={tokens.typography.fontSize.xs}
            color={tokens.colors.gray.gray6}
          >
            Public permalink
          </DsText>
          <DsText
            fontSize={tokens.typography.fontSize.xs}
            color={tokens.colors.gray.gray7}
            marginBlockStart="$1"
          >
            {permalink}
          </DsText>
          <YStack marginBlockStart="$2">
            <OutlineActionButton
              label="Share permalink"
              onPress={() => {
                void Share.share({message: permalink});
              }}
            />
          </YStack>
        </YStack>
      ) : null}
    </DsCard>
  );
};
