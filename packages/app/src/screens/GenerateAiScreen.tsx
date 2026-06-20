import {invalidateRecipeQueries, useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import type {CreateAiRecipeResult, TweakAiPhase} from '@eciperay/types';

import {
  AiSessionFlow,
  type AiSessionFlowApi,
  type AiSessionState,
} from '../components/ai/AiSessionFlow';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'GenerateAi'>;

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

export const GenerateAiScreen = ({navigation}: Props) => {
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const flowApi: AiSessionFlowApi = {
    start: async prompt => {
      const result = await api.createAi.start(prompt);
      return {session: mapSession(result.session)};
    },
    sendMessage: async (sessionId, content) => {
      const result = await api.createAi.sendMessage(sessionId, content);
      return {session: mapSession(result.session)};
    },
    approvePlan: async sessionId => {
      const result = await api.createAi.approvePlan(sessionId);
      return {session: mapSession(result.session)};
    },
    finalize: sessionId => api.createAi.createRecipe(sessionId),
    cancel: sessionId => api.createAi.cancel(sessionId),
  };

  return (
    <AiSessionFlow
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
      api={flowApi}
      onEmptyCancel={() => {
        navigation.goBack();
      }}
      onCancelSuccess={() => {
        navigation.goBack();
      }}
      onFinalizeSuccess={async result => {
        const {recipeId, versionId} = result as CreateAiRecipeResult;
        analytics.track('recipe_imported', {recipe_id: recipeId, source: 'ai'});
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        navigation.navigate('ImportReview', {recipeId});
      }}
    />
  );
};
