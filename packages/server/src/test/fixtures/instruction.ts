import type {Instruction, InstructionInput} from '@eciperay/types';

export const makeInstruction = (
  overrides: Partial<Instruction> = {},
): Instruction => ({
  id: 'instruction-uuid-1',
  recipeId: 'recipe-uuid-1',
  stepNumber: 1,
  body: 'Mix the ingredients together.',
  ...overrides,
});

export const makeInstructionInput = (
  overrides: Partial<InstructionInput> = {},
): InstructionInput => ({
  stepNumber: 1,
  body: 'Mix the ingredients together.',
  ...overrides,
});
