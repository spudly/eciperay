import {invalidateRecipeQueries} from '@eciperay/client';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import type {TweakAiApproveResult, TweakAiPhase} from '@eciperay/types';

import {
  AiSessionFlow,
  type AiSessionFlowApi,
  type AiSessionState,
} from '../hosts/ai/AiSessionFlow';
import {eciperay} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'TweakAi'>;

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

export const TweakAiScreen = ({route, navigation}: Props) => {
  const {i18n} = useLingui();
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const flowApi: AiSessionFlowApi = {
    start: async prompt => {
      const result = await eciperay.tweakAi.start(recipeId, prompt);
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

  return (
    <AiSessionFlow
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
      api={flowApi}
      onEmptyCancel={() => {
        navigation.goBack();
      }}
      onCancelSuccess={() => {
        navigation.goBack();
      }}
      onFinalizeSuccess={async result => {
        const {versionId} = result as TweakAiApproveResult;
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        navigation.navigate('EditVersion', {recipeId, versionId});
      }}
    />
  );
};
