export type TweakAiPhase =
  | 'planning'
  | 'plan_approved'
  | 'preview_ready'
  | 'completed'
  | 'cancelled';

export type TweakAiMessage = {role: 'user' | 'assistant'; content: string};

export type TweakAiSession = {
  id: string;
  recipeId: string;
  phase: TweakAiPhase;
  messages: TweakAiMessage[];
  approvedPlan: string | null;
  proposedRecipe: Record<string, unknown> | null;
  parentVersionId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTweakAiSessionResult = {
  session: TweakAiSession;
  plan: string;
};

export type TweakAiImplementResult = {
  session: TweakAiSession;
  changeSummary: string;
  preview: import('./recipeVersion.js').RecipeVersionInput;
};

export type TweakAiApproveResult = {
  session: TweakAiSession;
  versionId: string;
  version: import('./recipeVersion.js').RecipeVersionDetail;
};
