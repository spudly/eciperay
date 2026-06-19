import {invalidateRecipeQueries} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'TweakAi'>;

const PROMPT_PLACEHOLDER =
  'e.g. make it vegetarian, reduce sugar, add more spice';

export const TweakAiScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tweakMutation = useMutation({
    mutationFn: (text: string) => api.versions.tweakWithAi(recipeId, text),
    onSuccess: async result => {
      await invalidateRecipeQueries(queryClient, recipeId, result.versionId);
      navigation.navigate('EditVersion', {
        recipeId,
        versionId: result.versionId,
      });
    },
    onError: error_ => {
      setError(error_ instanceof Error ? error_.message : 'AI tweak failed');
    },
  });

  const handleSubmit = () => {
    setError(null);
    tweakMutation.mutate(prompt.trim());
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Tweak with AI
      </Text>
      <Text className="text-muted mb-6 text-sm">
        Describe how you want to change this recipe. AI will create a new draft
        version for you to review.
      </Text>
      <TextInput
        className="mb-4 min-h-48 rounded-lg border border-gray-300 px-4 py-3"
        placeholder={PROMPT_PLACEHOLDER}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        textAlignVertical="top"
      />
      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="rounded-lg border border-gray-200 px-4 py-3"
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Text className="text-sm font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`
            bg-primary flex-1 items-center rounded-lg py-3
            disabled:opacity-50
          `}
          disabled={tweakMutation.isPending || prompt.trim().length === 0}
          onPress={handleSubmit}
        >
          <Text className="font-semibold text-white">
            {tweakMutation.isPending ? 'Generating…' : 'Create draft'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
