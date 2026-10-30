import {invalidateRecipeQueries, useAuth} from '@eciperay/client';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {TweakAiApproveResult, TweakAiPhase} from '@eciperay/types';

import {eciperay} from '../lib/api.js';

import {
  AiSessionHost,
  type AiSessionFlowApi,
  type AiSessionState,
} from './AiSessionHost.js';

const PROMPT_PLACEHOLDER =
  'e.g. make it vegetarian, reduce sugar, add more spice';

const phaseLabel = (phase: TweakAiPhase) => {
  switch (phase) {
    case 'planning': {
      return 'Review the plan and refine it, or approve to build a preview.';
    }
    case 'preview_ready': {
      return 'Preview ready — save as a draft version or go back to refine.';
    }
    case 'completed': {
      return 'Draft saved.';
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

export const TweakAiPage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {session: authSession} = useAuth();

  const api: AiSessionFlowApi = {
    start: async prompt => {
      const result = await eciperay.tweakAi.start(recipeId, prompt);
      return {session: mapSession(result.session)};
    },
    get: async sessionId => {
      const result = await eciperay.tweakAi.get(recipeId, sessionId);
      return {session: mapSession(result.session)};
    },
    sendMessage: async (sessionId, content) => {
      const result = await eciperay.tweakAi.sendMessage(
        recipeId,
        sessionId,
        content,
      );
      return {session: mapSession(result.session)};
    },
    approvePlan: async sessionId => {
      const result = await eciperay.tweakAi.approvePlan(recipeId, sessionId);
      return {session: mapSession(result.session)};
    },
    finalize: sessionId => eciperay.tweakAi.createVersion(recipeId, sessionId),
    cancel: sessionId => eciperay.tweakAi.cancel(recipeId, sessionId),
  };

  const storageKey = `eciperay:tweak-ai-session-id:${recipeId}:${authSession?.user.id ?? 'anonymous'}`;

  return (
    <AiSessionHost
      // Keyed by the storage key (which encodes the recipe and the
      // account): switching the recipeId route param reuses this page
      // instance, and the host's session state (including which stored
      // session id it restores and persists) is per key; the key also
      // gains its account segment when auth resolves, and the remount
      // keeps the host's key-bound state on the settled key.
      key={storageKey}
      config={{
        title: 'Tweak with AI',
        intro:
          'Describe how you want to change this recipe. AI will propose a plan for you to review before creating a draft.',
        promptPlaceholder: PROMPT_PLACEHOLDER,
        startLabel: 'Start planning',
        startPendingLabel: 'Planning…',
        previewTitle: 'Draft preview',
        finalizeLabel: 'Save as draft',
        finalizePendingLabel: 'Saving…',
        phaseLabel,
      }}
      api={api}
      // Partitioned by recipe and by account (see GenerateAiPage).
      storageKey={storageKey}
      onEmptyCancel={() => {
        void navigate(`/recipes/${recipeId}`);
      }}
      onCancelSuccess={() => {
        void navigate(`/recipes/${recipeId}`);
      }}
      onFinalizeSuccess={async result => {
        const {versionId} = result as TweakAiApproveResult;
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        void navigate(`/recipes/${recipeId}/versions/${versionId}/edit`);
      }}
    />
  );
};
