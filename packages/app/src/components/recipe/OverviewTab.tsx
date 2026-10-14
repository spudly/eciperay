/* eslint-disable max-lines -- recipe overview with primary actions and lifecycle controls */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import React, {useState} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';

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
    <View className="p-4">
      {recipe.imageUrl ? (
        <View
          className="mbe-4 overflow-hidden rounded-xl bg-gray-50 inline-full"
          style={recipeImagePreviewStyles.frame}
        >
          <Image
            source={{uri: recipe.imageUrl}}
            resizeMode="contain"
            style={recipeImagePreviewStyles.image}
          />
        </View>
      ) : null}
      <Text className="mbe-2 text-2xl font-bold text-gray-900">
        {recipe.title}
      </Text>
      <View className="mbe-4 self-start">
        <RecipeStatusBadge status={recipe.status} />
      </View>
      {recipe.description ? (
        <Text className="mbe-4 text-gray-600">{recipe.description}</Text>
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
      <View className="mbe-4 flex-row flex-wrap gap-3">
        <TouchableOpacity
          className="
            bg-primary flex-1 items-center rounded-xl py-3 min-inline-[40%]
          "
          onPress={onStartCooking}
        >
          <Text className="font-semibold text-white">Start Cooking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="
            items-center justify-center rounded-xl bg-gray-100 inline-12
          "
          onPress={() => void printRecipe(recipe)}
        >
          <Text className="text-gray-700">🖨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="
            items-center justify-center rounded-xl bg-gray-100 inline-12
          "
          onPress={() => void shareRecipe(recipe)}
        >
          <Text className="text-gray-700">↗</Text>
        </TouchableOpacity>
        {canEditMetadata ? (
          <TouchableOpacity
            className="rounded-xl bg-gray-100 px-4 py-3"
            onPress={onEditRecipe}
          >
            <Text className="text-sm font-medium text-gray-700">Edit</Text>
          </TouchableOpacity>
        ) : null}
        {canEditDraft ? (
          <TouchableOpacity
            className="rounded-xl bg-gray-100 px-4 py-3"
            onPress={() => {
              onEditVersion(recipe.versionId);
            }}
          >
            <Text className="text-sm font-medium text-gray-700">
              Edit draft
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="rounded-xl bg-red-50 px-4 py-3"
          onPress={onDelete}
        >
          <Text className="text-sm font-medium text-red-600">Delete</Text>
        </TouchableOpacity>
      </View>
      {actionMessage ? (
        <Text
          accessibilityRole="text"
          className="mbe-4 text-center text-sm text-gray-600"
        >
          {actionMessage}
        </Text>
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
      <View className="flex-row flex-wrap gap-2">
        {recipe.tags.map(tag => (
          <TagPill
            key={tag.id}
            name={tag.name}
            color={tag.color}
          />
        ))}
      </View>
    </View>
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
