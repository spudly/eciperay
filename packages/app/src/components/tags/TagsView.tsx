import type {TagsViewProps} from '@eciperay/client';
import {Text as DsText, TextField as DsTextField, tokens} from '@spudly/ui';
import {TouchableOpacity} from 'react-native';
import {makeRecipeDetail} from '@eciperay/client';
import {useState} from 'react';
import {XStack, YStack} from 'tamagui';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {ColorPickerField} from '../ui/ColorPickerField';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenContainer} from '../ui/ScreenContainer';
import {TagPill} from '../ui/TagPill';

// Field backgrounds (issue #167): fields here render through @spudly/ui
// components, which all share the Warm Harvest $surface field background.
// The web mirror matches via its bg-field token (#fffdf8, the same surface).
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
    {/* ui-tag-form-row: mb-6 flex-row gap-2 */}
    <XStack
      marginBlockEnd="$6"
      gap="$2"
    >
      <YStack flex={1}>
        <DsTextField
          placeholder="Tag name"
          value={name}
          onChangeText={onNameChange}
        />
      </YStack>
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
    </XStack>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : (
      tags.map(tag => (
        /* ui-tag-list-item: mb-2 row, centered, space-between, rounded-lg
           surface card with the sm shadow */
        <XStack
          key={tag.id}
          marginBlockEnd="$2"
          alignItems="center"
          justifyContent="space-between"
          borderRadius={tokens.radii.md}
          backgroundColor="$surface"
          padding="$3"
          shadowColor={tokens.shadows.sm.shadowColor}
          shadowOffset={tokens.shadows.sm.shadowOffset}
          shadowOpacity={tokens.shadows.sm.shadowOpacity}
          shadowRadius={tokens.shadows.sm.shadowRadius}
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
            <DsText variant="error">Delete</DsText>
          </TouchableOpacity>
        </XStack>
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
