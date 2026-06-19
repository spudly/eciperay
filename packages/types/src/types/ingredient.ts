export type Ingredient = {
  id: string;
  recipeVersionId: string;
  sortOrder: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  isOptional: boolean;
};

export type IngredientInput = Omit<Ingredient, 'id' | 'recipeVersionId'>;
