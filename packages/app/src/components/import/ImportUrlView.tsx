import type {ImportUrlViewProps} from '@eciperay/client';
import {View} from 'react-native';
import {useState} from 'react';

import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';

export const ImportUrlView = ({
  url,
  onUrlChange,
  loading,
  error,
  onSubmit,
}: ImportUrlViewProps) => (
  <FormScreenLayout title="Import from URL">
    <TextField
      value={url}
      onChange={onUrlChange}
      placeholder="https://example.com/recipe"
    />
    {error ? (
      <View className="mb-4">
        <ErrorText>{error}</ErrorText>
      </View>
    ) : null}
    <PrimaryButton
      label="Import"
      loading={loading}
      loadingLabel="Importing…"
      disabled={!url.trim()}
      onPress={onSubmit}
    />
  </FormScreenLayout>
);

if (__DEV__) {
  const ImportUrlViewDemo = () => {
    const [url, setUrl] = useState('https://example.com/recipe');

    return (
      <ImportUrlView
        url={url}
        onUrlChange={setUrl}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
      />
    );
  };

  ImportUrlView.demo = () => <ImportUrlViewDemo />;
}
