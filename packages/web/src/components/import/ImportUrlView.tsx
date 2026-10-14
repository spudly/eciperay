import type {ImportUrlViewProps} from '@eciperay/client';
import {useState} from 'react';

import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';

export const ImportUrlView = ({
  url,
  onUrlChange,
  loading,
  error,
  onSubmit,
}: ImportUrlViewProps) => (
  <FormScreenLayout title="Import from URL">
    <form
      style={{display: "flex", flexDirection: "column", gap: 16}}
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <TextField
        value={url}
        onChange={onUrlChange}
        placeholder="https://example.com/recipe"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton
        label="Import"
        loading={loading}
        loadingLabel="Importing…"
        onPress={onSubmit}
      />
    </form>
  </FormScreenLayout>
);

if (import.meta.env.DEV) {
  ImportUrlView.demo = function ImportUrlViewDemo() {
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
}
