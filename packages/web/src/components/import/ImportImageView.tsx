import type {ImportImageViewProps} from '@eciperay/client';

import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';

export const ImportImageView = ({
  loading,
  error,
  onFileSelected,
}: ImportImageViewProps) => (
  <FormScreenLayout title="Import from Image">
    <input
      id="image-upload"
      type="file"
      accept="image/*"
      aria-label="Upload recipe image"
      disabled={loading}
      onChange={e => {
        const file = e.target.files?.[0];
        if (file) {
          onFileSelected?.(file);
        }
      }}
    />
    {loading ? <p className="text-muted mt-4">Importing…</p> : null}
    {error ? (
      <div className="mt-4">
        <ErrorText>{error}</ErrorText>
      </div>
    ) : null}
  </FormScreenLayout>
);

if (import.meta.env.DEV) {
  ImportImageView.demo = function ImportImageViewDemo() {
    return (
      <ImportImageView
        loading={false}
        onFileSelected={() => {
          void 0;
        }}
      />
    );
  };
}
