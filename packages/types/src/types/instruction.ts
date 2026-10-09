export type Instruction = {
  id: string;
  recipeVersionId: string;
  stepNumber: number;
  body: string;
  estimatedDurationMin: number | null;
};

export type InstructionInput = Omit<
  Instruction,
  'id' | 'recipeVersionId' | 'estimatedDurationMin'
>;
