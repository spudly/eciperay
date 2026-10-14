import {
  makeRecipeDetail,
  recipeDetailToInput,
  type ImportReviewViewProps,
} from '@eciperay/client';
import {Image, View} from 'react-native';

import {ErrorText} from '../ui/ErrorText';
import {FormScreenLayout} from '../ui/FormScreenLayout';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';
import {RecipeInputPreview} from '../recipe/RecipeInputPreview';

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
        className="mbe-4 rounded-xl block-48 inline-full"
        resizeMode="cover"
      />
    ) : null}
    <View className="ui-import-review-preview">{preview}</View>
    {error ? (
      <View className="mbe-4">
        <ErrorText>{error}</ErrorText>
      </View>
    ) : null}
    <View className="ui-import-review-actions">
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
    </View>
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
