import {
  buildRecipePath,
  invalidateRecipeQueries,
  useAuth,
} from '@eciperay/client';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import type {TweakAiApproveResult, TweakAiPhase} from '@eciperay/types';

import {eciperay} from '../lib/api.js';

import {
  AiSessionHost,
  type AiSessionFlowApi,
  type AiSessionState,
} from './AiSessionHost.js';

const promptPlaceholder = (i18n: I18n) =>
  i18n._({
    id: 'aiTweak.promptPlaceholder',
    message: 'e.g. make it vegetarian, ease up on the sugar, bring the heat',
  });

const phaseLabel = (i18n: I18n, phase: TweakAiPhase) => {
  switch (phase) {
    case 'planning': {
      return i18n._({
        id: 'aiSession.phasePlanningLabel',
        message:
          'Give the plan a once-over — refine it, or approve it and a preview gets built.',
      });
    }
    case 'preview_ready': {
      return i18n._({
        id: 'aiTweak.phasePreviewReadyLabel',
        message:
          'Preview ready — save it as a draft version, or head back and refine.',
      });
    }
    case 'completed': {
      return i18n._({id: 'aiTweak.phaseCompletedLabel', message: 'Draft saved.'});
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
  const {i18n} = useLingui();
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
        title: i18n._({id: 'aiTweak.title', message: 'Tweak with AI'}),
        intro: i18n._({
          id: 'aiTweak.intro',
          message:
            'Say what you want different — AI drafts a plan for your review before a draft is created.',
        }),
        promptPlaceholder: promptPlaceholder(i18n),
        startLabel: i18n._({
          id: 'aiSession.startLabel',
          message: 'Start planning',
        }),
        startPendingLabel: i18n._({
          id: 'aiSession.startPendingLabel',
          message: 'Planning…',
        }),
        previewTitle: i18n._({
          id: 'aiTweak.previewTitle',
          message: 'Draft preview',
        }),
        finalizeLabel: i18n._({
          id: 'aiTweak.finalizeLabel',
          message: 'Save as draft',
        }),
        finalizePendingLabel: i18n._({
          id: 'aiSession.finalizePendingLabel',
          message: 'Saving…',
        }),
        phaseLabel: phase => phaseLabel(i18n, phase),
      }}
      api={api}
      // Partitioned by recipe and by account (see GenerateAiPage).
      storageKey={storageKey}
      onEmptyCancel={() => {
        void navigate(buildRecipePath({id: recipeId}));
      }}
      onCancelSuccess={() => {
        void navigate(buildRecipePath({id: recipeId}));
      }}
      onFinalizeSuccess={async result => {
        const {versionId} = result as TweakAiApproveResult;
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        void navigate(`/recipes/${recipeId}/versions/${versionId}/edit`);
      }}
    />
  );
};
