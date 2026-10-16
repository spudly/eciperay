import {
  makeRecipeDetail,
  recipeDetailToInput,
  type ImportReviewViewProps,
} from '@eciperay/client';
import {tokens} from '@spudly/ui';
import {Image} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';
import {RecipeInputPreview} from '../recipe/RecipeInputPreview';

/* Import preview image geometry: block-48 height (192) with the xl radius
   value (12) — plain object on the RN Image, values from DS tokens. */
const imageStyle = {
  marginBottom: tokens.spacing[4],
  borderRadius: tokens.radii.lg,
  height: 192,
  width: '100%',
} as const;

export const ImportReviewView = ({
  versionLabel,
  imageUrl,
  preview,
  error,
  busy,
  acceptPending,
  editsPending,
  onAccept,
  onStartEdits,
}: ImportReviewViewProps) => (
  <FormScreenLayout
    title="Review Import"
    description={`This is your imported recipe (${versionLabel}). Looks good, or make edits to create a draft version.`}
  >
    {imageUrl ? (
      <Image
        source={{uri: imageUrl}}
        style={imageStyle}
        resizeMode="cover"
      />
    ) : null}
    {/* ui-import-review-preview: bordered surface card composition */}
    <YStack
      marginBlockEnd="$6"
      borderRadius={tokens.radii.lg}
      borderWidth={1}
      borderColor={tokens.colors.gray.gray3}
      backgroundColor="$surface"
      padding="$4"
    >
      {preview}
    </YStack>
    {error ? (
      <YStack marginBlockEnd="$4">
        <ErrorText>{error}</ErrorText>
      </YStack>
    ) : null}
    {/* ui-import-review-actions: wrapping button row */}
    <XStack
      flexWrap="wrap"
      gap="$3"
    >
      <PrimaryButton
        label={acceptPending ? 'Saving…' : 'Looks good'}
        disabled={busy}
        onPress={onAccept}
      />
      <SecondaryButton
        label={editsPending ? 'Creating draft…' : 'Make edits'}
        disabled={busy}
        onPress={onStartEdits}
      />
    </XStack>
  </FormScreenLayout>
);

if (__DEV__) {
  const mockPreviewRecipe = recipeDetailToInput(makeRecipeDetail());

  ImportReviewView.demo = () => (
    <ImportReviewView
      versionLabel="Imported v1"
      preview={<RecipeInputPreview recipe={mockPreviewRecipe} />}
      busy={false}
      acceptPending={false}
      editsPending={false}
      onAccept={() => {
        void 0;
      }}
      onStartEdits={() => {
        void 0;
      }}
    />
  );
}
