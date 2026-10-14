import type {TagsViewProps} from '@eciperay/client';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';
import {Card} from '@spudly/ui';
import {XStack, YStack} from 'tamagui';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {ColorPickerField} from '../ui/ColorPickerField.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TagPill} from '../ui/TagPill.js';

export const TagsView = ({
  tags,
  isLoading,
  name,
  color,
  onNameChange,
  onColorChange,
  onCreate,
  onDelete,
  isCreating,
}: TagsViewProps) => {
  const handleSubmit = (event: React.SubmitEvent) => {
    event.preventDefault();
    onCreate();
  };

  return (
    <>
      <PageTitle spacing="section">Tags</PageTitle>
      <form
        style={{display: "flex", gap: 8, marginBottom: 24}}
        onSubmit={handleSubmit}
      >
        <input
          className="
            flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2
            text-base text-gray-900
          "
          placeholder="Tag name"
          value={name}
          onChange={event => {
            onNameChange(event.target.value);
          }}
        />
        <ColorPickerField
          value={color}
          onChange={onColorChange}
        />
        <PrimaryButton
          label="Add"
          disabled={!name.trim() || isCreating}
          loading={isCreating}
          onPress={onCreate}
        />
      </form>
      {isLoading ? (
        <InlineLoadingIndicator loading />
      ) : (
        <YStack gap="$2">
          {tags.map(tag => (
            <Card
              key={tag.id}
              marginBottom="$2"
              padding="$3"
            >
              <XStack alignItems="center" justifyContent="space-between">
              <TagPill
                name={tag.name}
                color={tag.color}
              />
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => {
                  onDelete(tag.id);
                }}
              >
                Delete
              </button>
              </XStack>
            </Card>
          ))}
        </YStack>
      )}
    </>
  );
};

if (import.meta.env.DEV) {
  TagsView.demo = function TagsViewDemo() {
    const mockRecipe = makeRecipeDetail();
    const [name, setName] = useState('Weeknight');
    const [color, setColor] = useState('#6366f1');

    return (
      <TagsView
        tags={mockRecipe.tags}
        isLoading={false}
        name={name}
        color={color}
        onNameChange={setName}
        onColorChange={setColor}
        onCreate={() => {
          void 0;
        }}
        onDelete={() => {
          void 0;
        }}
        isCreating={false}
      />
    );
  };
}
