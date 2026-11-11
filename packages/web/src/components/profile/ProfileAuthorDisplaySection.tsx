import {errorMessage, queryKeys} from '@eciperay/client';
import type {AuthorDisplaySettings} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useId, useState} from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Text,
  XStack,
  YStack,
  styled,
} from 'tamagui';

import {eciperay} from '../../lib/api.js';

// Author display on public recipes (#411): the owner chooses the name
// shown as the author of their published recipes — and whether it is
// shown at all. The name also feeds the Recipe JSON-LD `author`.
// Mirrors ProfileNutritionGoalsSection's structure (host-composed
// section, query + mutation inside the section).

const FieldInput = styled(Input, {
  name: 'AuthorDisplayTextField',

  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$textMuted',
  borderRadius: tokens.radii.md,
  paddingHorizontal: tokens.spacing[3],
  minHeight: 44,
  fontSize: tokens.typography.fontSize.md,
  color: '$color',
});

const StyledCheckbox = styled(Checkbox, {
  name: 'AuthorDisplayCheckbox',

  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  borderWidth: 0,
});

const StyledCheckboxBox = styled(XStack, {
  name: 'AuthorDisplayCheckboxBox',

  width: 24,
  height: 24,
  overflow: 'hidden',
  borderWidth: 2,
  borderRadius: tokens.radii.sm,
  alignItems: 'center',
  justifyContent: 'center',
});

export const ProfileAuthorDisplaySection = () => {
  const queryClient = useQueryClient();
  const nameFieldId = useId();
  const checkboxId = useId();
  const checkboxLabelId = useId();
  const [settings, setSettings] = useState<AuthorDisplaySettings>({
    displayName: '',
    showOnPublicRecipes: true,
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  const {data: savedSettings} = useQuery({
    queryKey: queryKeys.authorDisplay(),
    queryFn: () => eciperay.account.getAuthorDisplay(),
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: () => eciperay.account.putAuthorDisplay(settings),
    onSuccess: data => {
      setSettings(data);
      setSaveError(null);
      void queryClient.invalidateQueries({queryKey: queryKeys.authorDisplay()});
      void queryClient.invalidateQueries({
        queryKey: queryKeys.publicRecipeDiscovery(),
      });
    },
    onError: error => {
      setSaveError(errorMessage(error));
    },
  });

  const saving = saveMutation.isPending;

  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
    >
      <YStack paddingBottom={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
        >
          Author name on public recipes
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[3]}>
        <YStack gap={tokens.spacing[1]}>
          <Label
            htmlFor={nameFieldId}
            fontSize={tokens.typography.fontSize.sm}
          >
            Display name
          </Label>
          <FieldInput
            id={nameFieldId}
            value={settings.displayName ?? ''}
            onChangeText={next => {
              setSettings(current => ({...current, displayName: next}));
            }}
            placeholder="Your name as recipe author"
            placeholderTextColor="$textMuted"
          />
        </YStack>
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
          <StyledCheckbox
            id={checkboxId}
            checked={settings.showOnPublicRecipes}
            onCheckedChange={next => {
              setSettings(current => ({
                ...current,
                showOnPublicRecipes: next === true,
              }));
            }}
            aria-labelledby={checkboxLabelId}
          >
            <StyledCheckboxBox
              borderColor={
                settings.showOnPublicRecipes ? '$primary' : '$textMuted'
              }
              backgroundColor={
                settings.showOnPublicRecipes ? '$primary' : '$surface'
              }
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
            </StyledCheckboxBox>
          </StyledCheckbox>
          <Label
            id={checkboxLabelId}
            onPress={() => {
              setSettings(current => ({
                ...current,
                showOnPublicRecipes: !current.showOnPublicRecipes,
              }));
            }}
            fontSize={tokens.typography.fontSize.md}
          >
            Show my name as the author on my published recipes
          </Label>
        </XStack>
        {saveError ? (
          <YStack
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            backgroundColor={tokens.colors.danger.danger1}
            borderColor={tokens.colors.danger.danger4}
          >
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.danger.danger8}
            >
              {saveError}
            </Text>
          </YStack>
        ) : null}
        <YStack paddingTop="$3">
          <Button
            backgroundColor="$primary"
            borderColor="transparent"
            borderWidth={1}
            borderRadius={tokens.radii.md}
            color="$onPrimary"
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            paddingHorizontal={tokens.spacing[4]}
            paddingVertical={tokens.spacing[3]}
            opacity={saving ? 0.5 : 1}
            disabled={saving}
            onPress={() => {
              saveMutation.mutate();
            }}
          >
            Save author display
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
};
