import type {TagsViewProps} from '@eciperay/client';
import {Text, TextInput, TouchableOpacity, View} from 'react-native';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenContainer} from '../ui/ScreenContainer';

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
      <TextInput
        className="ui-text-field w-24 p-2"
        placeholder="#6366f1"
        value={color}
        onChangeText={onColorChange}
        autoCapitalize="none"
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
          <View
            className="ui-tag-pill"
            style={{backgroundColor: `${tag.color}22`}}
          >
            <Text
              className="text-sm font-medium"
              style={{color: tag.color}}
            >
              {tag.name}
            </Text>
          </View>
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
