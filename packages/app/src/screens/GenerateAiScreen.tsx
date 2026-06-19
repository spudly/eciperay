import {useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'GenerateAi'>;

const PROMPT_PLACEHOLDER =
  'e.g. quick weeknight vegetarian pasta for 4, under 30 minutes';

export const GenerateAiScreen = ({navigation}: Props) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    /* istanbul ignore next -- generate button disabled when prompt is empty */
    if (trimmed.length === 0) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recipe = await api.import.importAi(trimmed);
      analytics.track('recipe_imported', {
        recipe_id: recipe.recipeId,
        source: 'ai',
      });
      navigation.navigate('ImportReview', {recipeId: recipe.recipeId});
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'Recipe generation failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Generate with AI
      </Text>
      <Text className="text-muted mb-4 text-sm">
        Describe the recipe you want and AI will draft it for you to review.
        Generation may take several seconds.
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
      <TouchableOpacity
        className="
          bg-primary items-center rounded-lg py-3
          disabled:opacity-50
        "
        disabled={loading || prompt.trim().length === 0}
        onPress={() => {
          void handleGenerate();
        }}
      >
        <Text className="font-semibold text-white">
          {loading ? 'Generating…' : 'Generate recipe'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
