/* eslint-disable max-lines -- conversational tweak UI */
import {
  errorMessage,
  invalidateRecipeQueries,
  parseProposedRecipe,
} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import React, {useState} from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {TweakAiMessage, TweakAiSession} from '@eciperay/types';

import {api} from '../lib/api';
import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview';
import type {RecipesStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RecipesStackParamList, 'TweakAi'>;

const PROMPT_PLACEHOLDER =
  'e.g. make it vegetarian, reduce sugar, add more spice';

const phaseLabel = (phase: TweakAiSession['phase']) => {
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

export const TweakAiScreen = ({route, navigation}: Props) => {
  const {recipeId} = route.params;
  const [prompt, setPrompt] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [session, setSession] = useState<TweakAiSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (text: string) => api.tweakAi.start(recipeId, text),
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
      api.tweakAi.sendMessage(recipeId, sessionId, content),
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
    mutationFn: (sessionId: string) =>
      api.tweakAi.approvePlan(recipeId, sessionId),
    onSuccess: result => {
      setSession(result.session);
      setError(null);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.tweakAi.createVersion(recipeId, sessionId),
    onSuccess: async result => {
      await invalidateRecipeQueries(queryClient, recipeId, result.versionId);
      navigation.navigate('EditVersion', {
        recipeId,
        versionId: result.versionId,
      });
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => api.tweakAi.cancel(recipeId, sessionId),
    onSuccess: () => {
      navigation.goBack();
    },
  });

  const busy =
    startMutation.isPending ||
    messageMutation.isPending ||
    approvePlanMutation.isPending ||
    createVersionMutation.isPending;

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
          Tweak with AI
        </Text>
        <Text className="text-muted mb-6 text-sm">
          Describe how you want to change this recipe. AI will propose a plan
          for you to review before creating a draft.
        </Text>
        <TextInput
          className="mb-4 min-h-48 rounded-lg border border-gray-300 px-4 py-3"
          placeholder={PROMPT_PLACEHOLDER}
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
            onPress={() => {
              navigation.goBack();
            }}
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
            <Text className="font-semibold text-white">Start planning</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">
        Tweak with AI
      </Text>
      <Text className="text-muted mb-4 text-sm">
        {phaseLabel(session.phase)}
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
            Draft preview
          </Text>
          <RecipeInputPreview recipe={previewRecipe} />
          <TouchableOpacity
            className="
              bg-primary mt-4 items-center rounded-lg px-4 py-3
              disabled:opacity-50
            "
            disabled={busy}
            onPress={() => {
              createVersionMutation.mutate(session.id);
            }}
          >
            <Text className="text-sm font-semibold text-white">
              Save as draft
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
