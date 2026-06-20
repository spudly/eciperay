/* eslint-disable max-lines -- recipe overview with primary actions and lifecycle controls */
import {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import React, {useState} from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';

import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';

import {OverviewActions} from './OverviewActions';
import {recipeImagePreviewStyles} from './recipeImagePreviewStyles';
import {StatBadge} from './StatBadge';

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
    recipe.lifecycleStatus,
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
          className="mb-4 w-full overflow-hidden rounded-xl bg-gray-50"
          style={recipeImagePreviewStyles.frame}
        >
          <Image
            source={{uri: recipe.imageUrl}}
            resizeMode="contain"
            style={recipeImagePreviewStyles.image}
          />
        </View>
      ) : null}
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        {recipe.title}
      </Text>
      {recipe.description ? (
        <Text className="mb-4 text-gray-600">{recipe.description}</Text>
      ) : null}
      <View className="mb-4 flex-row justify-around rounded-xl bg-gray-50 py-4">
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
      </View>
      <View className="mb-4 flex-row flex-wrap gap-3">
        <TouchableOpacity
          className="bg-primary min-w-[40%] flex-1 items-center rounded-xl py-3"
          onPress={onStartCooking}
        >
          <Text className="font-semibold text-white">Start Cooking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-12 items-center justify-center rounded-xl bg-gray-100"
          onPress={() => void printRecipe(recipe)}
        >
          <Text className="text-gray-700">🖨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="w-12 items-center justify-center rounded-xl bg-gray-100"
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
          className="mb-4 text-center text-sm text-gray-600"
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
      <View className="flex-row flex-wrap gap-2">
        {recipe.tags.map(tag => (
          <View
            key={tag.id}
            className="rounded-full px-3 py-1"
            style={{backgroundColor: `${tag.color}22`}}
          >
            <Text
              className="text-xs font-medium"
              style={{color: tag.color}}
            >
              {tag.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
