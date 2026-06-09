import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Alert, Text, TouchableOpacity, View} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportImage'>;

export const ImportImageScreen = ({navigation}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (source: 'camera' | 'library') => {
    setLoading(true);
    setError(null);
    try {
      const result =
        source === 'camera'
          ? await launchCamera({mediaType: 'photo', includeBase64: true})
          : await launchImageLibrary({mediaType: 'photo', includeBase64: true});

      if (result.didCancel) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      const recipe = await api.import.importImage(asset.base64 ?? '');
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      Alert.alert('Import failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">
        Import from Image
      </Text>
      <TouchableOpacity
        className="
          bg-primary mb-3 items-center rounded-lg py-3
          disabled:opacity-50
        "
        disabled={loading}
        onPress={() => {
          void handlePick('camera');
        }}
      >
        <Text className="font-semibold text-white">Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="
          items-center rounded-lg bg-gray-200 py-3
          disabled:opacity-50
        "
        disabled={loading}
        onPress={() => {
          void handlePick('library');
        }}
      >
        <Text className="font-medium text-gray-800">Choose from Library</Text>
      </TouchableOpacity>
      {loading ? <Text className="text-muted mt-4">Importing…</Text> : null}
      {error ? (
        <Text className="mt-4 text-sm text-red-600">{error}</Text>
      ) : null}
    </View>
  );
};
