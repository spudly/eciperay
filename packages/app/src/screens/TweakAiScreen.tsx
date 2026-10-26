import {invalidateRecipeQueries} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import type {TweakAiApproveResult, TweakAiPhase} from '@eciperay/types';

import {
  AiSessionFlow,
  type AiSessionFlowApi,
  type AiSessionState,
} from '../hosts/ai/AiSessionFlow';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'TweakAi'>;

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
  const {recipeId} = route.params;
  const queryClient = useQueryClient();

  const flowApi: AiSessionFlowApi = {
    start: async prompt => {
      const result = await api.tweakAi.start(recipeId, prompt);
      return {session: mapSession(result.session)};
    },
    sendMessage: async (sessionId, content) => {
      const result = await api.tweakAi.sendMessage(
        recipeId,
        sessionId,
        content,
      );
      return {session: mapSession(result.session)};
    },
    approvePlan: async sessionId => {
      const result = await api.tweakAi.approvePlan(recipeId, sessionId);
      return {session: mapSession(result.session)};
    },
    finalize: sessionId => api.tweakAi.createVersion(recipeId, sessionId),
    cancel: sessionId => api.tweakAi.cancel(recipeId, sessionId),
  };

  return (
    <AiSessionFlow
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
