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
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Linking, Share, Text, TouchableOpacity, View} from 'react-native';

import {api} from '../../lib/api';
import {CheckboxField} from '../ui/CheckboxField';
import {RadioOptionGroup} from '../ui/RadioOptionGroup';

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
    <View className="mbe-4 rounded-xl border border-gray-200 p-4">
      <Text className="mbe-2 text-sm font-semibold text-gray-900">Sharing</Text>
      <RadioOptionGroup
        name={`visibility-${recipe.id}`}
        value={pendingVisibility ?? recipe.visibility}
        disabled={sharingMutation.isPending}
        options={visibilityOptions.map(option => ({
          value: option,
          title: recipeVisibilityLabels[option],
          description: recipeVisibilityDescriptions[option],
        }))}
        onChange={value => {
          setPendingVisibility(value as RecipeVisibility);
        }}
      />
      {pendingVisibility === 'public' ? (
        <Text className="mbs-2 text-sm text-amber-800">
          This recipe will be discoverable by anyone browsing Eciperay.
        </Text>
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
              <Text
                className="text-primary font-medium"
                onPress={() => {
                  void Linking.openURL(PRIVACY_POLICY_URL);
                }}
              >
                Privacy Policy
              </Text>
              .
            </>
          }
        />
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <TouchableOpacity
          className="bg-primary mbs-3 rounded-lg px-3 py-2"
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
        <View className="mbs-3 gap-2">
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
        <View className="mbs-3">
          <Text className="text-xs text-gray-500">Public permalink</Text>
          <Text className="mbs-1 text-xs text-gray-700">{permalink}</Text>
          <TouchableOpacity
            className="mbs-2 rounded-lg border border-gray-200 px-3 py-2"
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

if (__DEV__) {
  const recipeVisibilityControlsDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={() => {
          void 0;
        }}
      />
    </Frame>
  );
  RecipeVisibilityControls.demo = recipeVisibilityControlsDemo;
}
