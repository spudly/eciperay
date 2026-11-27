import {invalidateRecipeQueries, useAnalytics} from '@eciperay/client';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQueryClient} from '@tanstack/react-query';
import React from 'react';
import type {CreateAiRecipeResult, TweakAiPhase} from '@eciperay/types';

import {
  AiSessionFlow,
  type AiSessionFlowApi,
  type AiSessionState,
} from '../hosts/ai/AiSessionFlow';
import {eciperay} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'GenerateAi'>;

const promptPlaceholder = (i18n: I18n) =>
  i18n._({
    id: 'aiGenerate.promptPlaceholder',
    message: 'e.g. quick weeknight vegetarian pasta for 4, under 30 minutes',
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
        id: 'aiGenerate.phasePreviewReadyLabel',
        message: 'Preview ready — save the recipe as-is, or head back and refine the plan.',
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

export const GenerateAiScreen = ({navigation}: Props) => {
  const {i18n} = useLingui();
  const queryClient = useQueryClient();
  const analytics = useAnalytics();

  const flowApi: AiSessionFlowApi = {
    start: async prompt => {
      const result = await eciperay.createAi.start(prompt);
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

  return (
    <AiSessionFlow
      config={{
        title: i18n._({id: 'aiGenerate.title', message: 'Generate with AI'}),
        intro: i18n._({
          id: 'aiGenerate.intro',
          message:
            'Describe the dish you have in mind — AI drafts a plan for your review before the recipe comes together.',
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
          id: 'aiGenerate.previewTitle',
          message: 'Recipe preview',
        }),
        finalizeLabel: i18n._({
          id: 'aiGenerate.finalizeLabel',
          message: 'Save recipe',
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
        const {recipeId, versionId} = result as CreateAiRecipeResult;
        analytics.track('recipe_imported', {recipe_id: recipeId, source: 'ai'});
        await invalidateRecipeQueries(queryClient, recipeId, versionId);
        navigation.navigate('ImportReview', {recipeId});
      }}
    />
  );
};
