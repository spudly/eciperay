export type Instruction = {
  id: string;
  recipeVersionId: string;
  stepNumber: number;
  body: string;
};

export type InstructionInput = Omit<Instruction, 'id' | 'recipeVersionId'>;
