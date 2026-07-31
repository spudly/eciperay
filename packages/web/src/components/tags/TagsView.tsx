import type {TagsViewProps} from '@eciperay/client';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';

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
        onSubmit={handleSubmit}
        className="ui-tag-form-row flex"
      >
        <input
          className="ui-text-field flex-1 py-2"
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
        <div className="space-y-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="ui-tag-list-item flex"
            >
              <TagPill
                name={tag.name}
                color={tag.color}
              />
              <button
                type="button"
                className="ui-error-text"
                onClick={() => {
                  onDelete(tag.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
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
