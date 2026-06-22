/* eslint-disable max-lines -- sharing controls include consent and link actions */
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {
  Linking,
  Pressable,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {api} from '../../lib/api';

type Props = {recipe: RecipeDetail; onActionMessage: (message: string) => void};

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

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
    <View className="mb-4 rounded-xl border border-gray-200 p-4">
      <Text className="mb-2 text-sm font-semibold text-gray-900">Sharing</Text>
      {visibilityOptions.map(option => (
        <Pressable
          key={option}
          className="mb-2 flex-row items-start gap-2"
          onPress={() => {
            setPendingVisibility(option);
          }}
        >
          <Text>
            {(pendingVisibility ?? recipe.visibility) === option ? '◉' : '○'}
          </Text>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-800">
              {recipeVisibilityLabels[option]}
            </Text>
            <Text className="text-xs text-gray-500">
              {recipeVisibilityDescriptions[option]}
            </Text>
          </View>
        </Pressable>
      ))}
      {pendingVisibility === 'public' ? (
        <Text className="mt-2 text-sm text-amber-800">
          This recipe will be discoverable by anyone browsing Eciperay.
        </Text>
      ) : null}
      {pendingVisibility &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) ? (
        <Pressable
          className="mt-3 flex-row items-start gap-2"
          onPress={() => {
            setPublishingConsent(current => !current);
          }}
        >
          <Text>{publishingConsent ? '☑' : '☐'}</Text>
          <Text className="flex-1 text-sm text-gray-700">
            I understand this recipe may be viewed without signing in and I
            agree to the{' '}
            <Text
              className="text-primary font-medium"
              onPress={() => {
                void Linking.openURL(PRIVACY_POLICY_URL);
              }}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <TouchableOpacity
          className="bg-primary mt-3 rounded-lg px-3 py-2"
          disabled={
            sharingMutation.isPending ||
            (requiresPublishingConsent(recipe.visibility, pendingVisibility) &&
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
          <Text className="text-center text-sm font-medium text-white">
            Save sharing settings
          </Text>
        </TouchableOpacity>
      ) : null}
      {activeVisibility === 'unlisted' ? (
        <View className="mt-3 gap-2">
          <TouchableOpacity
            className="rounded-lg border border-gray-200 px-3 py-2"
            disabled={rotateMutation.isPending}
            onPress={() => {
              rotateMutation.mutate();
            }}
          >
            <Text className="text-center text-sm font-medium text-gray-700">
              {shareToken ? 'Rotate share link' : 'Generate share link'}
            </Text>
          </TouchableOpacity>
          {shareUrl ? (
            <TouchableOpacity
              className="rounded-lg border border-gray-200 px-3 py-2"
              onPress={() => {
                void Share.share({message: shareUrl});
              }}
            >
              <Text className="text-center text-sm font-medium text-gray-700">
                Share link
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {activeVisibility === 'public' ? (
        <View className="mt-3">
          <Text className="text-xs text-gray-500">Public permalink</Text>
          <Text className="mt-1 text-xs text-gray-700">{permalink}</Text>
          <TouchableOpacity
            className="mt-2 rounded-lg border border-gray-200 px-3 py-2"
            onPress={() => {
              void Share.share({message: permalink});
            }}
          >
            <Text className="text-center text-sm font-medium text-gray-700">
              Share permalink
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};
