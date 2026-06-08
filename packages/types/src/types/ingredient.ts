export type Ingredient = {
  id: string;
  recipeId: string;
  sortOrder: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

export type IngredientInput = Omit<Ingredient, 'id' | 'recipeId'>;
