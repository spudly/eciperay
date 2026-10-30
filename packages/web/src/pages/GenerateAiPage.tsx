import {invalidateRecipeQueries, useAnalytics, useAuth} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import type {CreateAiRecipeResult, TweakAiPhase} from '@eciperay/types';

import {eciperay} from '../lib/api.js';

import {
  AiSessionHost,
  type AiSessionFlowApi,
  type AiSessionState,
} from './AiSessionHost.js';

const PROMPT_PLACEHOLDER =
  'e.g. quick weeknight vegetarian pasta for 4, under 30 minutes';

const phaseLabel = (phase: TweakAiPhase) => {
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
};

const mapSession = (session: {
  id: string;
  phase: TweakAiPhase;
  messages: AiSessionState['messages'];
  proposedRecipe: Record<string, unknown> | null;
}): AiSessionState => ({
  id: session.id,
  phase: session.phase,
  messages: session.messages,
  proposedRecipe: session.proposedRecipe,
});

export const GenerateAiPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();
  const {session: authSession} = useAuth();

  const api: AiSessionFlowApi = {
    start: async prompt => {
      const result = await eciperay.createAi.start(prompt);
      return {session: mapSession(result.session)};
    },
    get: async sessionId => {
      const result = await eciperay.createAi.get(sessionId);
      return {session: mapSession(result.session)};
    },
    sendMessage: async (sessionId, content) => {
      const result = await eciperay.createAi.sendMessage(sessionId, content);
      return {session: mapSession(result.session)};
    },
    approvePlan: async sessionId => {
      const result = await eciperay.createAi.approvePlan(sessionId);
      return {session: mapSession(result.session)};
    },
    finalize: sessionId => eciperay.createAi.createRecipe(sessionId),
    cancel: sessionId => eciperay.createAi.cancel(sessionId),
  };

  const storageKey = `eciperay:create-ai-session-id:${authSession?.user.id ?? 'anonymous'}`;

  return (
    <AiSessionHost
      // Keyed by the storage key: the key gains its account segment
      // when auth resolves, and the host's restore/adoption state is
      // bound to the key it first saw — a remount under the settled
      // key keeps every read, write, and shared-start lookup on the
      // same key. (In production AuthGuard settles auth before this
      // page renders, so the key is stable from the first render.)
      key={storageKey}
      config={{
        title: 'Generate with AI',
        intro:
          'Describe the recipe you want. AI will propose a plan for you to review before creating the recipe.',
        promptPlaceholder: PROMPT_PLACEHOLDER,
        startLabel: 'Start planning',
        startPendingLabel: 'Planning…',
        previewTitle: 'Recipe preview',
        finalizeLabel: 'Save recipe',
        finalizePendingLabel: 'Saving…',
        phaseLabel,
      }}
      api={api}
      // Partitioned by account: another account opening this flow in
      // the same browser must neither restore nor clear this
      // account's session pointer.
      storageKey={storageKey}
      onEmptyCancel={() => {
        void navigate(-1);
      }}
      onCancelSuccess={() => {
        void navigate(-1);
      }}
      onFinalizeSuccess={async result => {
        const {recipeId, versionId, recipe} = result as CreateAiRecipeResult;
        analytics.track('recipe_imported', {recipe_id: recipeId, source: 'ai'});
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        void navigate(`/import/review/${recipeId}`, {state: {recipe}});
      }}
    />
  );
};
