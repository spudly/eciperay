import {queryKeys, scaleQuantity} from '@recipoo/client';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import type {Ingredient, RecipeDetail} from '@recipoo/types';

import {recipoo} from '../../lib/api.js';

type Props = {
  recipe: RecipeDetail;
  scaleFactor: number;
  servings: number;
  onServingsChange: (s: number) => void;
};

const ServingsStepper = ({
  servings,
  onChange,
}: {
  servings: number;
  onChange: (n: number) => void;
}) => (
  <div className="mb-4 flex items-center gap-3">
    <span className="text-sm font-medium text-gray-700">Servings:</span>
    <button
      type="button"
      className="
        flex size-8 items-center justify-center rounded-full bg-gray-100 text-lg
        font-medium
      "
      onClick={() => {
        onChange(Math.max(1, servings - 1));
      }}
    >
      −
    </button>
    <span className="w-6 text-center text-base font-semibold">{servings}</span>
    <button
      type="button"
      className="
        flex size-8 items-center justify-center rounded-full bg-gray-100 text-lg
        font-medium
      "
      onClick={() => {
        onChange(servings + 1);
      }}
    >
      +
    </button>
  </div>
);

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
    className={`
      flex w-full items-center border-b border-gray-100 py-3 text-start
      ${missing ? 'opacity-40' : ''}
    `}
    onClick={onToggle}
  >
    <span className="flex-1 text-base text-gray-900">
      {scaleQuantity(ingredient.quantity, ingredient.unit, scaleFactor)}{' '}
      {ingredient.name}
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

  const {data: substitutions = []} = useQuery({
    queryKey: [...queryKeys.recipe(recipe.id), 'substitutions', missingNames],
    queryFn: () => recipoo.ai.substitutions(recipe.id, missingNames),
    enabled: missingNames.length > 0,
  });

  const toggle = (id: string) => {
    setMissing(prev => toggleSet(id, prev));
  };

  return (
    <div className="p-4">
      <ServingsStepper
        servings={servings}
        onChange={onServingsChange}
      />
      {recipe.ingredients.map(ing => (
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
        <p className="text-muted mt-3 text-sm">
          Click an ingredient to mark it missing and see substitutions below.
        </p>
      ) : null}
      {substitutions.length > 0 ? (
        <div className="mt-4 rounded-xl bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-900">
            Substitutions
          </p>
          {substitutions.map(sub => (
            <div
              key={sub.ingredient}
              className="mb-2"
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
