import {queryKeys} from '@recipoo/client';
import {useQuery} from '@tanstack/react-query';

import {recipoo} from '../../lib/api.js';

const NutritionRow = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) => (
  <div className="flex justify-between border-b border-gray-100 py-3">
    <span className="text-base text-gray-700">{label}</span>
    <span className="text-base font-semibold text-gray-900">
      {value}
      {unit}
    </span>
  </div>
);

type Props = {recipeId: string};

export const NutritionTab = ({recipeId}: Props) => {
  const {data, isLoading} = useQuery({
    queryKey: queryKeys.nutrition(recipeId),
    queryFn: () => recipoo.ai.nutrition(recipeId),
  });

  if (isLoading) {
    return <p className="text-muted p-4">Estimating nutrition…</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-4">
      <p
        className="
          mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500
        "
      >
        Per Serving
      </p>
      <NutritionRow
        label="Calories"
        value={data.calories}
        unit=""
      />
      <NutritionRow
        label="Protein"
        value={data.proteinG}
        unit="g"
      />
      <NutritionRow
        label="Carbs"
        value={data.carbsG}
        unit="g"
      />
      <NutritionRow
        label="Fat"
        value={data.fatG}
        unit="g"
      />
      {data.fiberG ? (
        <NutritionRow
          label="Fiber"
          value={data.fiberG}
          unit="g"
        />
      ) : null}
      {data.sodiumMg ? (
        <NutritionRow
          label="Sodium"
          value={data.sodiumMg}
          unit="mg"
        />
      ) : null}
      <p className="text-muted mt-4 text-xs">{data.disclaimer}</p>
    </div>
  );
};
