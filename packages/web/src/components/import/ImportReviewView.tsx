import type {ImportReviewViewProps} from '@eciperay/client';
import {makeRecipeDetail, recipeDetailToInput} from '@eciperay/client';

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
        className="mb-4 max-h-64 w-full rounded-xl object-cover"
      />
    ) : null}
    <div className="ui-import-review-preview bg-gray-50">{preview}</div>
    {error ? <ErrorText>{error}</ErrorText> : null}
    <div className="ui-import-review-actions">
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
    </div>
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
