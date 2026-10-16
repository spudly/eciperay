/* eslint-disable max-lines -- recipe overview with primary actions and lifecycle controls */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import React, {useState} from 'react';
import {Image} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';
import {StatBadge, StatBadgeRow} from '../ui/StatBadge';
import {TagPill} from '../ui/TagPill';

import {OverviewActions} from './OverviewActions';
import {RecipeStatusBadge} from './RecipeStatusBadge';
import {RecipeVisibilityControls} from './RecipeVisibilityControls';
import {recipeImagePreviewStyles} from './recipeImagePreviewStyles';

type Props = {
  recipe: RecipeDetail;
  activeVersionId: string;
  servings: number;
  versions: RecipeVersionSummary[];
  onStartCooking: () => void;
  onDelete: () => void;
  onTweakAi: () => void;
  onViewVersion: (versionId: string) => void;
  onEditRecipe: () => void;
  onEditVersion: (versionId: string) => void;
};

/**
 * The row's neutral actions (print/share/edit) keep their old gray-chip look —
 * a gray-100 fill with a gray-700 label — expressed as token overrides on the
 * DS secondary Button (the Stage 3a OutlineActionButton treatment).
 */
const neutralChipProps = {
  variant: 'secondary',
  backgroundColor: tokens.colors.gray.gray2,
  color: tokens.colors.gray.gray8,
} as const;

export const OverviewTab = ({
  recipe,
  activeVersionId,
  servings,
  versions,
  onStartCooking,
  onDelete,
  onTweakAi,
  onViewVersion,
  onEditRecipe,
  onEditVersion,
}: Props) => {
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const canEditDraft = canEditDraftVersion(recipe.versionId, versions);
  const canEditMetadata = canEditActiveRecipeMetadata(
    recipe.status,
    recipe.versionId,
    activeVersionId,
    versions,
  );

  const showActionMessage = (message: string) => {
    setActionMessage(message);
    setTimeout(() => {
      setActionMessage(null);
    }, 2500);
  };

  return (
    <YStack padding="$4">
      {recipe.imageUrl ? (
        <YStack
          marginBlockEnd="$4"
          overflow="hidden"
          borderRadius={tokens.radii.lg}
          backgroundColor={tokens.colors.gray.gray1}
          style={recipeImagePreviewStyles.frame}
        >
          <Image
            source={{uri: recipe.imageUrl}}
            resizeMode="contain"
            style={recipeImagePreviewStyles.image}
          />
        </YStack>
      ) : null}
      <DsText
        fontSize={tokens.typography.fontSize['2xl']}
        fontWeight={tokens.typography.fontWeight.bold}
        color={tokens.colors.gray.gray10}
        marginBlockEnd="$2"
      >
        {recipe.title}
      </DsText>
      <YStack
        marginBlockEnd="$4"
        alignSelf="flex-start"
      >
        <RecipeStatusBadge status={recipe.status} />
      </YStack>
      {recipe.description ? (
        <DsText
          color={tokens.colors.gray.gray7}
          marginBlockEnd="$4"
        >
          {recipe.description}
        </DsText>
      ) : null}
      <StatBadgeRow>
        <StatBadge
          label="Servings"
          value={String(servings)}
        />
        {recipe.prepTimeMin ? (
          <StatBadge
            label="Prep"
            value={`${recipe.prepTimeMin}m`}
          />
        ) : null}
        {recipe.cookTimeMin ? (
          <StatBadge
            label="Cook"
            value={`${recipe.cookTimeMin}m`}
          />
        ) : null}
      </StatBadgeRow>
      <XStack
        marginBlockEnd="$4"
        flexWrap="wrap"
        gap="$3"
      >
        <DsButton
          variant="primary"
          flex={1}
          minWidth="40%"
          onPress={onStartCooking}
        >
          Start Cooking
        </DsButton>
        <DsButton
          {...neutralChipProps}
          width="$12"
          paddingHorizontal={0}
          onPress={() => void printRecipe(recipe)}
        >
          🖨
        </DsButton>
        <DsButton
          {...neutralChipProps}
          width="$12"
          paddingHorizontal={0}
          onPress={() => void shareRecipe(recipe)}
        >
          ↗
        </DsButton>
        {canEditMetadata ? (
          <DsButton
            {...neutralChipProps}
            onPress={onEditRecipe}
          >
            Edit
          </DsButton>
        ) : null}
        {canEditDraft ? (
          <DsButton
            {...neutralChipProps}
            onPress={() => {
              onEditVersion(recipe.versionId);
            }}
          >
            Edit draft
          </DsButton>
        ) : null}
        <DsButton
          variant="secondary"
          backgroundColor={tokens.colors.danger.danger1}
          color={tokens.colors.danger.danger7}
          onPress={onDelete}
        >
          Delete
        </DsButton>
      </XStack>
      {actionMessage ? (
        <DsText
          accessibilityRole="text"
          marginBlockEnd="$4"
          textAlign="center"
          fontSize={tokens.typography.fontSize.sm}
          color={tokens.colors.gray.gray7}
        >
          {actionMessage}
        </DsText>
      ) : null}
      <OverviewActions
        recipe={recipe}
        versions={versions}
        onActionMessage={showActionMessage}
        onTweakAi={onTweakAi}
        onViewVersion={onViewVersion}
      />
      <RecipeVisibilityControls
        recipe={recipe}
        onActionMessage={showActionMessage}
      />
      <XStack
        flexWrap="wrap"
        gap="$2"
      >
        {recipe.tags.map(tag => (
          <TagPill
            key={tag.id}
            name={tag.name}
            color={tag.color}
          />
        ))}
      </XStack>
    </YStack>
  );
};

if (__DEV__) {
  const OverviewTabDemo = () => {
    const recipe = makeRecipeDetail();
    return (
      <OverviewTab
        recipe={recipe}
        activeVersionId={recipe.versionId}
        servings={recipe.servings}
        versions={[makeRecipeVersionSummary()]}
        onStartCooking={() => {
          void 0;
        }}
        onDelete={() => {
          void 0;
        }}
        onTweakAi={() => {
          void 0;
        }}
        onViewVersion={() => {
          void 0;
        }}
        onEditRecipe={() => {
          void 0;
        }}
        onEditVersion={() => {
          void 0;
        }}
      />
    );
  };

  const overviewTabDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <OverviewTabDemo />
    </Frame>
  );
  OverviewTab.demo = overviewTabDemo;
}
