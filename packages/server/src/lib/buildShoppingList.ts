import type {ShoppingListLine, ShoppingListSource} from '@eciperay/types';

export type ShoppingIngredientInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  isOptional: boolean;
  servings: number;
  recipeServings: number;
  quantityMultiplier: number;
  source: ShoppingListSource;
};

const normalize = (value: string | null): string =>
  (value ?? '').trim().toLowerCase();

const groupKey = (name: string, unit: string | null): string =>
  `${normalize(name)}::${normalize(unit)}`;

export const buildShoppingList = (
  ingredients: ShoppingIngredientInput[],
): ShoppingListLine[] => {
  type Acc = {
    name: string;
    unit: string | null;
    quantities: (number | null)[];
    isOptional: boolean;
    sources: ShoppingListSource[];
  };

  const groups = new Map<string, Acc>();

  for (const ingredient of ingredients) {
    if (ingredient.recipeServings <= 0) {
      continue;
    }
    const scale =
      (ingredient.servings / ingredient.recipeServings) *
      ingredient.quantityMultiplier;
    const scaledQty =
      ingredient.quantity === null ? null : ingredient.quantity * scale;
    const key = groupKey(ingredient.name, ingredient.unit);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        name: ingredient.name.trim(),
        unit: ingredient.unit,
        quantities: [scaledQty],
        isOptional: ingredient.isOptional,
        sources: [ingredient.source],
      });
      continue;
    }
    existing.quantities.push(scaledQty);
    existing.isOptional = existing.isOptional && ingredient.isOptional;
    existing.sources.push(ingredient.source);
  }

  const lines: ShoppingListLine[] = [...groups.entries()].map(
    ([key, group]) => {
      const numericQuantities = group.quantities.filter(
        (q): q is number => q !== null,
      );
      const quantity =
        numericQuantities.length === group.quantities.length
          ? numericQuantities.reduce((sum, q) => sum + q, 0)
          : null;
      return {
        key,
        name: group.name,
        quantity,
        unit: group.unit,
        isOptional: group.isOptional,
        sources: group.sources,
      };
    },
  );

  lines.sort((a, b) => a.name.localeCompare(b.name));
  return lines;
};
