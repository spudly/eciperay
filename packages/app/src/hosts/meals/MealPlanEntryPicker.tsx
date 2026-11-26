import {tokens} from '@spudly/ui';
import {Pressable, TextInput} from 'react-native';
import {Text, YStack} from 'tamagui';

import type {
  MealPlanPickerOption,
  MealPlanPickerRequest,
} from './useMealPlanInlineEditing';

/**
 * The meal plan inline editor's entry picker (#646, tranche
 * 1): the panel the detail screen shows when a day's Add meal /
 * Add recipe or a meal's Add recipe intent fires. Search-first
 * (the plan's picker model): one search field, then the
 * matching meals or recipes as tappable rows — meals are
 * matched client-side (the meals endpoint has no search),
 * recipes arrive from the host's server-side search. Grouping
 * follows the picker's kind: a meal pick lists meals, a recipe
 * pick lists recipes. Selecting a row performs the add through
 * the hook and closes the panel.
 */
export const MealPlanEntryPicker = ({
  request,
  searchText,
  onSearchTextChange,
  isSearching,
  options,
  onSelect,
  onClose,
}: {
  request: MealPlanPickerRequest;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  isSearching: boolean;
  options: MealPlanPickerOption[];
  onSelect: (option: MealPlanPickerOption) => void;
  onClose: () => void;
}) => {
  const title =
    request.kind === 'meal'
      ? `Add a meal to ${request.day}`
      : request.kind === 'recipe'
        ? `Add a recipe to ${request.day}`
        : `Add a recipe to ${request.mealTitle}`;
  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      zIndex={10}
      padding="$4"
      gap="$3"
      backgroundColor={tokens.colors.gray.gray2}
      borderColor={tokens.colors.gray.gray6}
      borderWidth={1}
      borderRadius="$4"
      margin="$4"
    >
      <Text fontSize="$5" fontWeight="600">
        {title}
      </Text>
      <TextInput
        value={searchText}
        onChangeText={onSearchTextChange}
        placeholder={
          request.kind === 'meal' ? 'Search meals…' : 'Search recipes…'
        }
        accessibilityLabel={
          request.kind === 'meal' ? 'Search meals' : 'Search recipes'
        }
        autoFocus
        style={{
          borderWidth: 1,
          borderColor: tokens.colors.gray.gray6,
          borderRadius: 8,
          padding: 10,
        }}
      />
      {isSearching ? <Text>Searching…</Text> : null}
      {!isSearching && options.length === 0 ? (
        <Text>
          {searchText.trim()
            ? 'No matches found.'
            : request.kind === 'meal'
              ? 'Type to search your meals.'
              : 'Type to search recipes.'}
        </Text>
      ) : null}
      {options.map(option => (
        <Pressable
          key={`${option.kind}:${option.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Add ${option.title}`}
          onPress={() => {
            onSelect(option);
          }}
        >
          <Text paddingVertical="$2">
            {option.kind === 'meal' ? 'Meal · ' : 'Recipe · '}
            {option.title}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel adding"
        onPress={onClose}
      >
        <Text paddingVertical="$2">Cancel</Text>
      </Pressable>
    </YStack>
  );
};
