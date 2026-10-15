import {
  formatScaledIngredientLine,
  makeRecipeDetail,
  queryKeys,
  sortIngredientsByOrder,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import type {Ingredient, RecipeDetail} from '@eciperay/types';
import clsx from 'clsx';

import {eciperay} from '../../lib/api.js';

import {ScaleMultiplierButtons} from './ScaleMultiplierButtons.js';
import {ServingsStepper} from './ServingsStepper.js';

type Props = {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
  onServingsChange: (s: number) => void;
};

const toggleSet = (id: string, prev: Set<string>): Set<string> => {
  const next = new Set(prev);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

const IngredientRow = ({
  ingredient,
  scaleFactor,
  missing,
  onToggle,
}: {
  ingredient: Ingredient;
  scaleFactor: number;
  missing: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className={clsx(
      'flex items-center border-be border-gray-100 py-3 text-start inline-full',
      {'opacity-40': missing},
    )}
    onClick={onToggle}
  >
    <span className="flex-1 text-base text-gray-900">
      {formatScaledIngredientLine(ingredient, scaleFactor)}
    </span>
    {ingredient.isOptional ? (
      <span className="text-muted ms-2 text-xs">optional</span>
    ) : null}
  </button>
);

export const IngredientsTab = ({
  recipe,
  scaleFactor,
  servings,
  onServingsChange,
}: Props) => {
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const missingNames = recipe.ingredients
    .filter(ing => missing.has(ing.id))
    .map(ing => ing.name);

  const {data: substitutions = [], isFetching: substitutionsLoading} = useQuery(
    {
      queryKey: [...queryKeys.recipe(recipe.id), 'substitutions', missingNames],
      queryFn: () => eciperay.ai.substitutions(recipe.id, missingNames),
      enabled: missingNames.length > 0,
    },
  );

  const toggle = (id: string) => {
    setMissing(prev => toggleSet(id, prev));
  };

  return (
    <div className="p-4">
      <ServingsStepper
        servings={servings}
        onChange={onServingsChange}
      />
      <ScaleMultiplierButtons
        baseServings={recipe.servings}
        servings={servings}
        onServingsChange={onServingsChange}
      />
      {sortIngredientsByOrder(recipe.ingredients).map(ing => (
        <IngredientRow
          key={ing.id}
          ingredient={ing}
          scaleFactor={scaleFactor}
          missing={missing.has(ing.id)}
          onToggle={() => {
            toggle(ing.id);
          }}
        />
      ))}
      {missing.size > 0 ? (
        <p className="text-muted mbs-3 text-sm">
          Click an ingredient to mark it missing and see substitutions below.
        </p>
      ) : null}
      {missingNames.length > 0 && substitutionsLoading ? (
        <p className="text-muted mbs-4 text-sm">Finding substitutions…</p>
      ) : null}
      {substitutions.length > 0 ? (
        <div className="mbs-4 rounded-xl bg-blue-50 p-4">
          <p className="mbe-2 text-sm font-semibold text-blue-900">
            Substitutions
          </p>
          {substitutions.map(sub => (
            <div
              key={sub.ingredient}
              className="mbe-2"
            >
              <p className="text-sm font-medium text-gray-900">
                {sub.ingredient}
              </p>
              <p className="text-sm text-gray-600">
                {sub.suggestions.join(', ')}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  const IngredientsTabDemo = () => {
    const [servings, setServings] = useState(4);
    const recipe = makeRecipeDetail();
    return (
      <IngredientsTab
        recipe={recipe}
        scaleFactor={1}
        servings={servings}
        onServingsChange={setServings}
      />
    );
  };

  const ingredientsTabDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <IngredientsTabDemo />
    </Frame>
  );
  IngredientsTab.demo = ingredientsTabDemo;
}
