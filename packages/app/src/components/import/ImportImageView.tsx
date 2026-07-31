import type {ImportImageViewProps} from '@eciperay/client';
import {Text, View} from 'react-native';

import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';

export const ImportImageView = ({
  loading,
  error,
  onPickCamera,
  onPickLibrary,
}: ImportImageViewProps) => (
  <FormScreenLayout title="Import from Image">
    <PrimaryButton
      label="Take Photo"
      loading={loading}
      onPress={() => {
        onPickCamera?.();
      }}
    />
    <View className="mt-3">
      <SecondaryButton
        label="Choose from Library"
        disabled={loading}
        onPress={() => {
          onPickLibrary?.();
        }}
      />
    </View>
    {loading ? <Text className="text-muted mt-4">Importing…</Text> : null}
    {error ? (
      <View className="mt-4">
        <ErrorText>{error}</ErrorText>
      </View>
    ) : null}
  </FormScreenLayout>
);

if (__DEV__) {
  ImportImageView.demo = () => (
    <ImportImageView
      loading={false}
      onPickCamera={() => {
        void 0;
      }}
      onPickLibrary={() => {
        void 0;
      }}
    />
  );
}
