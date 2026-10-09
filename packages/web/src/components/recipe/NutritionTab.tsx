import {
  makeRecipeDetail,
  nutritionTabRows,
  queryKeys,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../../lib/api.js';

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
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const {data, isLoading, isFetching} = useQuery({
    queryKey: queryKeys.nutrition(recipeId),
    queryFn: () => eciperay.ai.nutrition(recipeId),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const next = await eciperay.ai.nutrition(recipeId, {refresh: true});
      queryClient.setQueryData(queryKeys.nutrition(recipeId), next);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recipe(recipeId),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.recipeLists()});
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return <p className="text-muted p-4">Estimating nutrition…</p>;
  }

  if (!data) {
    return (
      <div className="p-4">
        <p className="text-muted mb-3">Nutrition is not available yet.</p>
        <button
          type="button"
          className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"
          onClick={() => {
            void handleRefresh();
          }}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Estimate nutrition'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className="
            text-sm font-semibold uppercase tracking-wide text-gray-500
          "
        >
          Per Serving
        </p>
        <button
          type="button"
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-800"
          onClick={() => {
            void handleRefresh();
          }}
          disabled={refreshing || isFetching}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {nutritionTabRows(data).map(row => (
        <NutritionRow
          key={row.label}
          {...row}
        />
      ))}
      <p className="text-muted mt-4 text-xs">{data.disclaimer}</p>
    </div>
  );
};

if (import.meta.env.DEV) {
  NutritionTab.demo = (({Frame}) => (
    <Frame>
      <NutritionTab recipeId={makeRecipeDetail().id} />
    </Frame>
  )) satisfies ShowcaseDemoRenderer;
}
