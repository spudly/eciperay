import {
  formatScaleMultiplierLabel,
  isActiveScaleMultiplier,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
  type RecipeScaleMultiplier,
} from '@eciperay/client';
import {useMemo, useState} from 'react';

import {ToggleChipGroup} from '../ui/ToggleChipGroup.js';

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
    <div className="mbe-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Scale:</span>
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
    </div>
  );
};

if (import.meta.env.DEV) {
  ScaleMultiplierButtons.demo = function ScaleMultiplierButtonsDemo() {
    const [servings, setServings] = useState(4);

    return (
      <ScaleMultiplierButtons
        baseServings={4}
        servings={servings}
        onServingsChange={setServings}
      />
    );
  };
}
