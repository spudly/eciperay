import type {ImportReviewViewProps} from '@eciperay/client';
import {makeRecipeDetail, recipeDetailToInput} from '@eciperay/client';
import {Card} from '@spudly/ui';
import {XStack} from 'tamagui';

import {ErrorText} from '../ui/ErrorText.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';
import {RecipeInputPreview} from '../recipe/RecipeInputPreview.js';

export const ImportReviewView = ({
  versionLabel,
  imageUrl,
  imageAlt,
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
      <img
        src={imageUrl}
        alt={imageAlt ?? 'Imported recipe'}
        className="mbe-4 rounded-xl object-cover inline-full max-block-64"
      />
    ) : null}
    <Card backgroundColor="$surface" padding="$4" marginBottom="$6">{preview}</Card>
    {error ? <ErrorText>{error}</ErrorText> : null}
    <XStack flexWrap="wrap" gap="$3">
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

if (import.meta.env.DEV) {
  ImportReviewView.demo = function ImportReviewViewDemo() {
    const mockPreviewRecipe = recipeDetailToInput(makeRecipeDetail());

    return (
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
  };
}
