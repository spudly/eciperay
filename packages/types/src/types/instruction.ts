export type Instruction = {
  id: string;
  recipeId: string;
  stepNumber: number;
  body: string;
};

export type InstructionInput = Omit<Instruction, 'id' | 'recipeId'>;
