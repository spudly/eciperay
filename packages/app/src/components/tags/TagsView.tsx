import type {TagsViewProps} from '@eciperay/client';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {ColorPickerField} from '../ui/ColorPickerField';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenContainer} from '../ui/ScreenContainer';
import {TagPill} from '../ui/TagPill';

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
}: TagsViewProps) => (
  <ScreenContainer>
    <PageTitle spacing="section">Tags</PageTitle>
    <View className="ui-tag-form-row">
      <TextInput
        className="ui-text-field flex-1 py-2"
        placeholder="Tag name"
        value={name}
        onChangeText={onNameChange}
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
    </View>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : (
      tags.map(tag => (
        <View
          key={tag.id}
          className="ui-tag-list-item"
        >
          <TagPill
            name={tag.name}
            color={tag.color}
          />
          <TouchableOpacity
            onPress={() => {
              onDelete(tag.id);
            }}
          >
            <Text className="ui-error-text">Delete</Text>
          </TouchableOpacity>
        </View>
      ))
    )}
  </ScreenContainer>
);

if (__DEV__) {
  const TagsViewDemo = () => {
    const [name, setName] = useState('Weeknight');
    const [color, setColor] = useState('#6366f1');

    return (
      <TagsView
        tags={makeRecipeDetail().tags}
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

  TagsView.demo = () => <TagsViewDemo />;
}
