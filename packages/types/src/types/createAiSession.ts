import type {RecipeVersionInput} from './recipeVersion.js';
import type {CreateRecipeResult, RecipeDetail} from './recipe.js';
import type {TweakAiMessage, TweakAiPhase} from './tweakAiSession.js';

export type CreateAiSession = {
  id: string;
  phase: TweakAiPhase;
  messages: TweakAiMessage[];
  approvedPlan: string | null;
  proposedRecipe: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAiSessionStartResult = {
  session: CreateAiSession;
  plan: string;
};

export type CreateAiImplementResult = {
  session: CreateAiSession;
  changeSummary: string;
  preview: RecipeVersionInput;
};

export type CreateAiRecipeResult = CreateRecipeResult & {
  session: CreateAiSession;
  recipe: RecipeDetail;
};
