import {
  formatScaleMultiplierLabel,
  isActiveScaleMultiplier,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
  type RecipeScaleMultiplier,
} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {useMemo, useState} from 'react';
import {XStack} from 'tamagui';

import {ToggleChipGroup} from '../ui/ToggleChipGroup';

type Props = {
  baseServings: number;
  servings: number;
  onServingsChange: (servings: number) => void;
};

export const ScaleMultiplierButtons = ({
  baseServings,
  servings,
  onServingsChange,
}: Props) => {
  const options = useMemo(
    () =>
      RECIPE_SCALE_MULTIPLIERS.map(multiplier => ({
        id: String(multiplier),
        label: formatScaleMultiplierLabel(multiplier),
      })),
    [],
  );

  const selectedId =
    RECIPE_SCALE_MULTIPLIERS.find(multiplier =>
      isActiveScaleMultiplier(baseServings, servings, multiplier),
    )?.toString() ?? String(RECIPE_SCALE_MULTIPLIERS[0]);

  return (
    <XStack
      marginBlockEnd="$4"
      flexWrap="wrap"
      alignItems="center"
      gap="$2"
    >
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.medium}
        color={tokens.colors.gray.gray8}
      >
        Scale:
      </DsText>
      <ToggleChipGroup
        options={options}
        selectedId={selectedId}
        onChange={value => {
          if (typeof value === 'string') {
            onServingsChange(
              servingsForMultiplier(
                baseServings,
                Number(value) as RecipeScaleMultiplier,
              ),
            );
          }
        }}
      />
    </XStack>
  );
};

if (__DEV__) {
  const ScaleMultiplierButtonsDemo = () => {
    const [servings, setServings] = useState(4);

    return (
      <ScaleMultiplierButtons
        baseServings={4}
        servings={servings}
        onServingsChange={setServings}
      />
    );
  };

  ScaleMultiplierButtons.demo = () => <ScaleMultiplierButtonsDemo />;
}
