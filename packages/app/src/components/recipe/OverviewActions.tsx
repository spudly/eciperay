/* eslint-disable max-lines -- recipe overview actions with version lifecycle controls */
import {
  invalidateRecipeQueries,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  truncateChangeSummary,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import React from 'react';
import {XStack, YStack} from 'tamagui';

import {api} from '../../lib/api';

type Props = {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  onActionMessage: (message: string) => void;
  onTweakAi: () => void;
  onViewVersion: (versionId: string) => void;
};

/**
 * The lifecycle actions keep their old soft-chip looks — outline-neutral,
 * info-tinted, success-tinted, danger-tinted — expressed as token overrides on
 * the DS secondary Button (the Stage 3a OutlineActionButton treatment). The old
 * indigo tint maps to the DS info treatment ($primarySubtle fill /
 * $primaryEmphasis label), as in the Stage 3a substitutions panel.
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

export const OverviewActions = ({
  recipe,
  versions,
  onActionMessage,
  onTweakAi,
  onViewVersion,
}: Props) => {
  const queryClient = useQueryClient();

  const isEditable =
    recipe.status !== 'perfected' && recipe.status !== 'abandoned';

  const candidates = versions.filter(v => v.derivedRole === 'candidate');

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const statusMutation = useMutation({
    mutationFn: (status: RecipeDetail['status']) =>
      api.recipes.patchStatus(recipe.id, status),
    onSuccess: () => {
      void invalidate();
    },
  });

  const activateMutation = useMutation({
    mutationFn: (versionId: string) =>
      api.versions.activate(recipe.id, versionId),
    onSuccess: () => {
      void invalidate();
      onActionMessage('Version activated');
    },
  });

  const tweakManualMutation = useMutation({
    mutationFn: () => api.versions.create(recipe.id),
    onSuccess: version => {
      void invalidate();
      onViewVersion(version.id);
    },
  });

  if (!isEditable && candidates.length === 0) {
    return null;
  }

  return (
    <>
      {isEditable ? (
        <XStack
          marginBlockEnd="$4"
          flexWrap="wrap"
          gap="$2"
        >
          <OutlineActionButton
            label="Tweak manually"
            disabled={tweakManualMutation.isPending}
            onPress={() => {
              tweakManualMutation.mutate();
            }}
          />
          <DsButton
            variant="ghost"
            size="sm"
            borderWidth={1}
            borderColor="$primary"
            backgroundColor="$primarySubtle"
            color="$primaryEmphasis"
            onPress={onTweakAi}
          >
            Tweak with AI
          </DsButton>
          <DsButton
            variant="secondary"
            size="sm"
            backgroundColor={tokens.colors.success.success2}
            color={tokens.colors.success.success9}
            disabled={statusMutation.isPending}
            onPress={() => {
              statusMutation.mutate('perfected');
            }}
          >
            Mark perfected
          </DsButton>
          <DsButton
            variant="secondary"
            size="sm"
            backgroundColor={tokens.colors.danger.danger2}
            color={tokens.colors.danger.danger9}
            disabled={statusMutation.isPending}
            onPress={() => {
              statusMutation.mutate('abandoned');
            }}
          >
            Abandon
          </DsButton>
        </XStack>
      ) : null}
      {candidates.length > 0 ? (
        <YStack
          marginBlockEnd="$4"
          gap="$2"
        >
          <DsText
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray10}
          >
            Ready to activate
          </DsText>
          {candidates.map(version => (
            <YStack
              key={version.id}
              borderRadius={tokens.radii.md}
              borderWidth={1}
              borderColor={tokens.colors.terracotta.terracotta3}
              backgroundColor="$primarySubtle"
              padding="$3"
            >
              <DsText
                marginBlockEnd="$2"
                fontSize={tokens.typography.fontSize.sm}
                color={tokens.colors.gray.gray9}
              >
                v{version.versionNumber}
                {version.changeSummary
                  ? `: ${truncateChangeSummary(version.changeSummary)}`
                  : ''}
              </DsText>
              <DsButton
                variant="primary"
                size="sm"
                alignSelf="flex-start"
                disabled={activateMutation.isPending}
                onPress={() => {
                  activateMutation.mutate(version.id);
                }}
              >
                Activate
              </DsButton>
            </YStack>
          ))}
        </YStack>
      ) : null}
    </>
  );
};

if (__DEV__) {
  const overviewActionsDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <OverviewActions
          recipe={recipe}
          versions={[makeRecipeVersionSummary()]}
          onActionMessage={() => {
            void 0;
          }}
          onTweakAi={() => {
            void 0;
          }}
          onViewVersion={() => {
            void 0;
          }}
        />
      </Frame>
    );
  };
  OverviewActions.demo = overviewActionsDemo;
}
