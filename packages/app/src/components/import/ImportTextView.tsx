import type {ImportTextViewProps} from '@eciperay/client';
import {useState} from 'react';
import {YStack} from 'tamagui';

import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {MultilineField} from '../ui/MultilineField';
import {PrimaryButton} from '../ui/PrimaryButton';

export const ImportTextView = ({
  loading,
  error,
  onSubmit,
}: ImportTextViewProps) => {
  const [text, setText] = useState('');

  return (
    <FormScreenLayout
      title="Import from text"
      description="Paste a recipe from Word, a web page, or any rich text source."
    >
      <MultilineField
        value={text}
        onChange={setText}
        placeholder="Paste your recipe here…"
      />
      {error ? (
        <YStack marginBlockEnd="$4">
          <ErrorText>{error}</ErrorText>
        </YStack>
      ) : null}
      <PrimaryButton
        label="Import"
        loading={loading}
        loadingLabel="Importing…"
        disabled={!text.trim()}
        onPress={() => {
          onSubmit(text);
        }}
      />
    </FormScreenLayout>
  );
};

if (__DEV__) {
  ImportTextView.demo = () => (
    <ImportTextView
      loading={false}
      onSubmit={() => {
        void 0;
      }}
    />
  );
}
