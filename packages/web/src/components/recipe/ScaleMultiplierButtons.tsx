import {
  formatScaleMultiplierLabel,
  isActiveScaleMultiplier,
  RECIPE_SCALE_MULTIPLIERS,
  servingsForMultiplier,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

type Props = {
  baseServings: number;
  servings: number;
  onServingsChange: (servings: number) => void;
};

export const ScaleMultiplierButtons = ({
  baseServings,
  servings,
  onServingsChange,
}: Props) => (
  <div className="mb-4 flex flex-wrap items-center gap-2">
    <span className="text-sm font-medium text-gray-700">Scale:</span>
    {RECIPE_SCALE_MULTIPLIERS.map(multiplier => (
      <button
        key={multiplier}
        type="button"
        className={clsx('rounded-full px-3 py-1 text-sm font-medium', {
          'bg-primary text-white': isActiveScaleMultiplier(
            baseServings,
            servings,
            multiplier,
          ),
          'bg-gray-100 text-gray-700': !isActiveScaleMultiplier(
            baseServings,
            servings,
            multiplier,
          ),
        })}
        onClick={() => {
          onServingsChange(servingsForMultiplier(baseServings, multiplier));
        }}
      >
        {formatScaleMultiplierLabel(multiplier)}
      </button>
    ))}
  </div>
);

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
