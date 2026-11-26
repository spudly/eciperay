export type Instruction = {
  id: string;
  recipeVersionId: string;
  stepNumber: number;
  body: string;
  estimatedDurationMin: number | null;
  /**
   * Ordered IDs of the ingredients (same recipe version) this step uses
   * (#643). Many-to-many: one ingredient may be referenced by several
   * steps. Empty for legacy recipes that have no links yet — cook mode
   * falls back to the full ingredient list in that case.
   */
  ingredientReferences: string[];
};

export type InstructionInput = Omit<
  Instruction,
  'id' | 'recipeVersionId' | 'estimatedDurationMin' | 'ingredientReferences'
> & {
  /**
   * Optional on input: hosts that do not link ingredients yet omit it and
   * the server stores an empty list. When present, every ID must belong
   * to an ingredient of the same recipe version (validated on write).
   */
  ingredientReferences?: string[];
};
