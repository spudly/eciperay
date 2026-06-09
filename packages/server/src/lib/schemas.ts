import {z} from 'zod';

export {validate, parseAiJson} from './validate.js';
export type {Infer} from './validate.js';

// ─── Ingredient / Instruction primitives ──────────────────────────────────────

export const IngredientInputSchema = z.object({
  sortOrder: z.number().int().nonnegative(),
  name: z.string().min(1),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  notes: z.string().nullable(),
  isOptional: z.boolean(),
});

export const InstructionInputSchema = z.object({
  stepNumber: z.number().int().positive(),
  body: z.string().min(1),
});

// ─── Recipe import (from URL or image) ────────────────────────────────────────

export const RecipeImportSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  servings: z.number().int().positive(),
  prepTimeMin: z.number().int().nonnegative().nullable(),
  cookTimeMin: z.number().int().nonnegative().nullable(),
  sourceUrl: z.url().nullish(),
  ingredients: z.array(IngredientInputSchema),
  instructions: z.array(InstructionInputSchema),
});

// ─── API request bodies ────────────────────────────────────────────────────────

const StarRating = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const RecipeInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  servings: z.number().int().positive(),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
  imageUrl: z.url().nullish(),
  starRating: StarRating.nullish(),
  sourceUrl: z.url().nullish(),
  ingredients: z.array(IngredientInputSchema),
  instructions: z.array(InstructionInputSchema),
  tagIds: z.array(z.uuid()),
});

export const RecipeUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullish(),
  servings: z.number().int().positive().optional(),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
  imageUrl: z.url().nullish(),
  starRating: StarRating.nullish(),
});

export const TagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .optional(),
});

export const RecipeNoteInputSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const ImportUrlSchema = z.object({url: z.url()});

export const ImportImageSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z
    .enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    .optional(),
});

/** Pasted HTML from Word or web pages can be much larger than the visible text. */
export const IMPORT_TEXT_RAW_MAX = 500_000;
/** Max length of recipe content after HTML is stripped. */
export const IMPORT_TEXT_PLAIN_MAX = 100_000;

export const ImportTextSchema = z.object({
  text: z.string().min(1).max(IMPORT_TEXT_RAW_MAX),
});

export const SyncUserSchema = z.object({
  displayName: z.string().max(100).optional(),
});

export const GenerateRecipeImageSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  ingredients: z.array(z.string()).default([]),
});

// ─── AI response shapes ────────────────────────────────────────────────────────

const RecipeDiffSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullish(),
  servings: z.number().int().positive().optional(),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
  ingredients: z.array(IngredientInputSchema).optional(),
  instructions: z.array(InstructionInputSchema).optional(),
});

export const AiChatResponseSchema = z.object({
  reasoning: z.string(),
  summary_of_changes: z.string(),
  diff: RecipeDiffSchema,
});

export const AiCleanupResponseSchema = z.object({
  summary_of_changes: z.string(),
  diff: RecipeDiffSchema,
});

export const AiSubstitutionSchema = z.object({
  ingredient: z.string(),
  suggestions: z.array(z.string()),
});

export const AiSubstitutionsResponseSchema = z.array(AiSubstitutionSchema);

export const AiNutritionResponseSchema = z.object({
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  sugarG: z.number().nonnegative().nullable(),
  sodiumMg: z.number().nonnegative().nullable(),
  disclaimer: z.string(),
});
