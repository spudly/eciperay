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

export const RecipeDevelopmentStatusSchema = z.enum([
  'idea',
  'in_development',
  'perfected',
]);

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
  sourceUrl: z.url().nullish(),
  ingredients: z.array(IngredientInputSchema),
  instructions: z.array(InstructionInputSchema),
  tagIds: z.array(z.uuid()),
  developmentStatus: RecipeDevelopmentStatusSchema.optional(),
});

export const RecipeMetadataInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  servings: z.number().int().positive(),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
  imageUrl: z.url().nullish(),
  sourceUrl: z.url().nullish(),
  tagIds: z.array(z.uuid()),
  developmentStatus: RecipeDevelopmentStatusSchema.optional(),
});

export const RecipeVersionInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  servings: z.number().int().positive(),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
  imageUrl: z.url().nullish(),
  sourceUrl: z.url().nullish(),
  ingredients: z.array(IngredientInputSchema),
  instructions: z.array(InstructionInputSchema),
  tagIds: z.array(z.uuid()),
});

export const RecipeLifecyclePatchSchema = z.object({
  status: z.enum(['idea', 'evolving', 'perfected', 'abandoned']),
});

export const RecipeSharingPatchSchema = z.object({
  visibility: z.enum(['private', 'unlisted', 'public']),
  publishingConsent: z.boolean().optional(),
});

export const RecipeCloneSchema = z.object({
  shareToken: z.string().min(1).optional(),
});

export const CookLogInputSchema = z.object({
  authorStarRating: StarRating.nullish(),
  notes: z.string().max(4000).nullish(),
});

export const RecipeUpdateSchema = z.object({imageUrl: z.url()});

export const TagInputSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .optional(),
});

export const ImportUrlSchema = z.object({url: z.url()});

export const ImportImageSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z
    .enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    .optional(),
});

/**
 * Max request size for pasted content. Embedded base64 images are stripped
 * before recipe text is validated, but the raw payload can be much larger.
 */
export const IMPORT_TEXT_REQUEST_MAX = 10_000_000;
/** Max length of recipe content after HTML is stripped. */
export const IMPORT_TEXT_PLAIN_MAX = 100_000;

export const ImportTextSchema = z.object({
  text: z.string().min(1).max(IMPORT_TEXT_REQUEST_MAX),
});

export const IMPORT_AI_PROMPT_MAX = 2000;

export const ImportAiSchema = z.object({
  prompt: z.string().trim().min(10).max(IMPORT_AI_PROMPT_MAX),
});

export const TweakAiSchema = z.object({
  prompt: z.string().trim().min(10).max(IMPORT_AI_PROMPT_MAX),
});

export const TweakAiStartSchema = z.object({
  prompt: z.string().trim().min(10).max(IMPORT_AI_PROMPT_MAX),
});

export const TweakAiMessageSchema = z.object({
  content: z.string().trim().min(1).max(IMPORT_AI_PROMPT_MAX),
});

// ─── Bulk export / import ─────────────────────────────────────────────────────

export const RecipeExportImageSchema = z.object({
  base64: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
});

export const RecipeExportTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .optional(),
});

export const RecipeExportRecordSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  servings: z.number().int().positive(),
  prepTimeMin: z.number().int().nonnegative().nullable(),
  cookTimeMin: z.number().int().nonnegative().nullable(),
  starRating: StarRating.nullable(),
  sourceUrl: z.url().nullable(),
  tags: z.array(RecipeExportTagSchema),
  ingredients: z.array(IngredientInputSchema),
  instructions: z.array(InstructionInputSchema),
  image: RecipeExportImageSchema.optional(),
});

export const BulkImportSchema = z.object({
  formatVersion: z.literal(1).optional(),
  exportedAt: z.string().optional(),
  recipes: z.array(RecipeExportRecordSchema).min(1),
});

export type {ExportRecipesInput} from './exportRecipesSchema.js';
export {ExportRecipesSchema} from './exportRecipesSchema.js';

export const SyncUserSchema = z.object({
  displayName: z.string().max(100).optional(),
});

export const GenerateRecipeImageIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
});

export const GenerateRecipeImageSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  ingredients: z.array(GenerateRecipeImageIngredientSchema).default([]),
  instructions: z.array(z.string()).default([]),
});

export const GenerateRecipeDescriptionSchema = z.object({
  title: z.string().min(1),
  ingredients: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  prepTimeMin: z.number().int().nonnegative().nullish(),
  cookTimeMin: z.number().int().nonnegative().nullish(),
});

// ─── AI response shapes ────────────────────────────────────────────────────────

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
