import type {ImportImageViewProps} from '@eciperay/client';
import {Text as DsText} from '@spudly/ui';
import {YStack} from 'tamagui';

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
    <YStack marginBlockStart="$3">
      <SecondaryButton
        label="Choose from Library"
        disabled={loading}
        onPress={() => {
          onPickLibrary?.();
        }}
      />
    </YStack>
    {loading ? (
      <DsText
        color="$textMuted"
        marginBlockStart="$4"
      >
        Importing…
      </DsText>
    ) : null}
    {error ? (
      <YStack marginBlockStart="$4">
        <ErrorText>{error}</ErrorText>
      </YStack>
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
