import {useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportUrl'>;

export const ImportUrlScreen = ({navigation}: Props) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();

  const handleImport = async () => {
    /* istanbul ignore next -- import button disabled when URL is empty */
    if (!url.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recipe = await api.import.importUrl(url);
      analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'url'});
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">
        Import from URL
      </Text>
      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3"
        placeholder="https://example.com/recipe"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        keyboardType="url"
      />
      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}
      <TouchableOpacity
        className="
          bg-primary items-center rounded-lg py-3
          disabled:opacity-50
        "
        disabled={loading || !url.trim()}
        onPress={() => {
          void handleImport();
        }}
      >
        <Text className="font-semibold text-white">
          {loading ? 'Importing…' : 'Import'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
