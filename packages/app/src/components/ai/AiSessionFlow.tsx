/* eslint-disable max-lines -- shared conversational AI session UI */
import {
  createShowcaseAiSessionFlowApi,
  errorMessage,
  parseProposedRecipe,
  showcaseAiSessionConfig,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {useMutation} from '@tanstack/react-query';
import React, {useState} from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {TweakAiMessage, TweakAiPhase} from '@eciperay/types';

import {RecipeInputPreview} from '../recipe/RecipeInputPreview';

export type AiSessionState = {
  id: string;
  phase: TweakAiPhase;
  messages: TweakAiMessage[];
  proposedRecipe: Record<string, unknown> | null;
};

export type AiSessionFlowConfig = {
  title: string;
  intro: string;
  promptPlaceholder: string;
  startLabel: string;
  startPendingLabel: string;
  previewTitle: string;
  finalizeLabel: string;
  finalizePendingLabel: string;
  phaseLabel: (phase: TweakAiPhase) => string;
};

export type AiSessionFlowApi = {
  start: (prompt: string) => Promise<{session: AiSessionState}>;
  sendMessage: (
    sessionId: string,
    content: string,
  ) => Promise<{session: AiSessionState}>;
  approvePlan: (sessionId: string) => Promise<{session: AiSessionState}>;
  finalize: (sessionId: string) => Promise<unknown>;
  cancel: (sessionId: string) => Promise<unknown>;
};

type Props = {
  config: AiSessionFlowConfig;
  api: AiSessionFlowApi;
  onEmptyCancel: () => void;
  onFinalizeSuccess: (result: unknown) => void | Promise<void>;
  onCancelSuccess: () => void;
};

export const AiSessionFlow = ({
  config,
  api,
  onEmptyCancel,
  onFinalizeSuccess,
  onCancelSuccess,
}: Props) => {
  const [prompt, setPrompt] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [session, setSession] = useState<AiSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: (text: string) => api.start(text),
    onSuccess: result => {
      setSession(result.session);
      setPrompt('');
      setError(null);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const messageMutation = useMutation({
    mutationFn: ({sessionId, content}: {sessionId: string; content: string}) =>
      api.sendMessage(sessionId, content),
    onSuccess: result => {
      setSession(result.session);
      setFollowUp('');
      setError(null);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const approvePlanMutation = useMutation({
    mutationFn: (sessionId: string) => api.approvePlan(sessionId),
    onSuccess: result => {
      setSession(result.session);
      setError(null);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: (sessionId: string) => api.finalize(sessionId),
    onSuccess: async result => {
      await onFinalizeSuccess(result);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => api.cancel(sessionId),
    onSuccess: () => {
      onCancelSuccess();
    },
  });

  const busy =
    startMutation.isPending ||
    messageMutation.isPending ||
    approvePlanMutation.isPending ||
    finalizeMutation.isPending;

  const previewRecipe = session?.proposedRecipe
    ? parseProposedRecipe(session.proposedRecipe)
    : null;

  const renderMessage = (message: TweakAiMessage, index: number) => (
    <View
      key={`${message.role}-${index}`}
      className={
        message.role === 'user'
          ? 'ms-8 rounded-lg bg-gray-100 p-3'
          : 'me-8 rounded-lg bg-indigo-50 p-3'
      }
    >
      <Text className="mb-1 text-xs font-semibold uppercase text-gray-500">
        {message.role === 'user' ? 'You' : 'Plan'}
      </Text>
      <Text className="text-sm text-gray-800">{message.content}</Text>
    </View>
  );

  if (!session) {
    return (
      <View className="flex-1 bg-gray-50 px-4 pt-4">
        <Text className="mb-2 text-2xl font-bold text-gray-900">
          {config.title}
        </Text>
        <Text className="text-muted mb-6 text-sm">{config.intro}</Text>
        <TextInput
          className="mb-4 min-h-48 rounded-lg border border-gray-300 px-4 py-3"
          placeholder={config.promptPlaceholder}
          value={prompt}
          onChangeText={setPrompt}
          multiline
          textAlignVertical="top"
        />
        {error ? (
          <Text className="mb-4 text-sm text-red-600">{error}</Text>
        ) : null}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="rounded-lg border border-gray-200 px-4 py-3"
            onPress={onEmptyCancel}
          >
            <Text className="text-sm font-medium text-gray-700">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="
              bg-primary flex-1 items-center rounded-lg py-3
              disabled:opacity-50
            "
            disabled={busy || prompt.trim().length === 0}
            onPress={() => {
              startMutation.mutate(prompt.trim());
            }}
          >
            <Text className="font-semibold text-white">
              {startMutation.isPending
                ? config.startPendingLabel
                : config.startLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        {config.title}
      </Text>
      <Text className="text-muted mb-4 text-sm">
        {config.phaseLabel(session.phase)}
      </Text>
      <View className="mb-4 gap-3">{session.messages.map(renderMessage)}</View>
      {session.phase === 'planning' ? (
        <View className="mb-4 gap-3">
          <TextInput
            className="min-h-24 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Ask for changes to the plan…"
            value={followUp}
            onChangeText={setFollowUp}
            multiline
            textAlignVertical="top"
          />
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              className="
                rounded-lg border border-gray-200 px-4 py-2
                disabled:opacity-50
              "
              disabled={busy || followUp.trim().length === 0}
              onPress={() => {
                messageMutation.mutate({
                  sessionId: session.id,
                  content: followUp.trim(),
                });
              }}
            >
              <Text className="text-sm font-medium text-gray-700">
                Refine plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="
                rounded-lg bg-indigo-600 px-4 py-2
                disabled:opacity-50
              "
              disabled={busy}
              onPress={() => {
                approvePlanMutation.mutate(session.id);
              }}
            >
              <Text className="text-sm font-medium text-white">
                {approvePlanMutation.isPending
                  ? 'Building preview…'
                  : 'Approve plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      {session.phase === 'preview_ready' && previewRecipe ? (
        <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <Text className="mb-3 text-sm font-semibold text-gray-900">
            {config.previewTitle}
          </Text>
          <RecipeInputPreview recipe={previewRecipe} />
          <TouchableOpacity
            className="
              bg-primary mt-4 items-center rounded-lg px-4 py-3
              disabled:opacity-50
            "
            disabled={busy}
            onPress={() => {
              finalizeMutation.mutate(session.id);
            }}
          >
            <Text className="text-sm font-semibold text-white">
              {finalizeMutation.isPending
                ? config.finalizePendingLabel
                : config.finalizeLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {error ? (
        <Text className="mb-4 text-sm text-red-600">{error}</Text>
      ) : null}
      {session.phase !== 'completed' && session.phase !== 'cancelled' ? (
        <TouchableOpacity
          className="
            mb-8
            disabled:opacity-50
          "
          disabled={busy}
          onPress={() => {
            cancelMutation.mutate(session.id);
          }}
        >
          <Text className="text-sm text-gray-500 underline">
            Cancel session
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
};

if (__DEV__) {
  const aiSessionFlowDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <AiSessionFlow
        config={showcaseAiSessionConfig}
        api={createShowcaseAiSessionFlowApi()}
        onEmptyCancel={() => {
          void 0;
        }}
        onFinalizeSuccess={() => {
          void 0;
        }}
        onCancelSuccess={() => {
          void 0;
        }}
      />
    </Frame>
  );
  AiSessionFlow.demo = aiSessionFlowDemo;
}
