import type {AuthorDisplaySettings} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useId} from 'react';
import {Checkbox, Label, Text, XStack} from 'tamagui';

import {
  LabeledTextInput,
  SectionAlert,
  SectionButton,
  SectionCard,
} from './profileSection';

/**
 * Author display on public recipes (#411): the owner chooses the name shown as
 * the author of their published recipes — and whether it is shown at all. The
 * name also feeds the Recipe JSON-LD `author`. Mirrors NutritionGoalsForm's
 * contract: the screen keeps the query, the form state as a whole, and the save
 * mutation.
 */

export type AuthorDisplayFormProps = {
  settings: AuthorDisplaySettings;
  onChange: (settings: AuthorDisplaySettings) => void;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
};

export const AuthorDisplayForm = ({
  settings,
  onChange,
  saving = false,
  error,
  onSave,
}: AuthorDisplayFormProps) => {
  const checkboxId = useId();
  const labelId = `${checkboxId}-label`;
  const shown = settings.showOnPublicRecipes;
  const toggle = () => {
    onChange({...settings, showOnPublicRecipes: !shown});
  };

  return (
    <SectionCard title="Author name on public recipes">
      <LabeledTextInput
        label="Display name"
        value={settings.displayName ?? ''}
        onChangeText={next => {
          onChange({...settings, displayName: next});
        }}
        placeholder="Your name as recipe author"
      />
      <Text
        fontSize={tokens.typography.fontSize.sm}
        color="$textMuted"
      >
        This name will be displayed on published recipes as their author.
      </Text>
      <XStack
        alignItems="center"
        gap={tokens.spacing[3]}
        minHeight={44}
      >
        <Checkbox
          id={checkboxId}
          checked={shown}
          onCheckedChange={next => {
            onChange({...settings, showOnPublicRecipes: next === true});
          }}
          aria-labelledby={labelId}
          accessibilityLabel="Show my name as the author on my published recipes"
          width={24}
          height={24}
          borderWidth={2}
          borderRadius={tokens.radii.sm}
          borderColor={shown ? '$primary' : '$textMuted'}
          backgroundColor={shown ? '$primary' : '$surface'}
        >
          <Checkbox.Indicator>
            <Text
              aria-hidden
              color="$onPrimary"
              fontSize={tokens.typography.fontSize.sm}
              fontWeight={tokens.typography.fontWeight.bold}
            >
              ✓
            </Text>
          </Checkbox.Indicator>
        </Checkbox>
        <Label
          id={labelId}
          onPress={toggle}
          fontSize={tokens.typography.fontSize.md}
          flex={1}
        >
          Show my name as the author on my published recipes
        </Label>
      </XStack>
      {error ? (
        <SectionAlert
          severity="error"
          message={error}
        />
      ) : null}
      <SectionButton
        disabled={saving}
        onPress={onSave}
      >
        Save author display
      </SectionButton>
    </SectionCard>
  );
};
