import type {TweakAiPhase} from '@eciperay/types';

export {
  makeRecipeDetail,
  makeRecipeVersionSummary,
  VERSION_ID,
} from '../test/fixtures/recipe.js';

const showcaseAiSession = {
  id: 'showcase-ai-session',
  phase: 'planning' as const,
  messages: [] as {role: 'user' | 'assistant'; content: string}[],
  proposedRecipe: null as Record<string, unknown> | null,
};

export const showcaseAiSessionConfig = {
  title: 'Generate with AI',
  intro:
    'Describe the recipe you want. AI will propose a plan for you to review before creating the recipe.',
  promptPlaceholder: 'e.g. quick weeknight vegetarian pasta',
  startLabel: 'Start planning',
  startPendingLabel: 'Planning…',
  previewTitle: 'Recipe preview',
  finalizeLabel: 'Save recipe',
  finalizePendingLabel: 'Saving…',
  phaseLabel: (phase: TweakAiPhase) => {
    switch (phase) {
      case 'planning': {
        return 'Review the plan and refine it, or approve to build a preview.';
      }
      case 'preview_ready': {
        return 'Preview ready — save the recipe or go back to refine the plan.';
      }
      default: {
        return '';
      }
    }
  },
};

export const createShowcaseAiSessionFlowApi = () => ({
  start: (prompt: string) =>
    Promise.resolve({
      session: {
        ...showcaseAiSession,
        messages: [{role: 'user' as const, content: prompt}],
      },
    }),
  sendMessage: (_sessionId: string, content: string) =>
    Promise.resolve({
      session: {
        ...showcaseAiSession,
        messages: [
          {role: 'user' as const, content: 'Showcase prompt'},
          {role: 'assistant' as const, content},
        ],
      },
    }),
  approvePlan: () =>
    Promise.resolve({
      session: {
        ...showcaseAiSession,
        phase: 'preview_ready' as const,
        proposedRecipe: {title: 'Showcase Recipe', servings: 4},
      },
    }),
  finalize: () => Promise.resolve({id: 'recipe-uuid-1'}),
  cancel: () => Promise.resolve(),
});
