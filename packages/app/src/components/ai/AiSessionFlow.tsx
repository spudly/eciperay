/* eslint-disable max-lines -- shared conversational AI session UI */
import {
  createShowcaseAiSessionFlowApi,
  errorMessage,
  parseProposedRecipe,
  showcaseAiSessionConfig,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import {
  Button as DsButton,
  MultilineField as DsMultilineField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import {useMutation} from '@tanstack/react-query';
import React, {useState} from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import {XStack, YStack} from 'tamagui';
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

/* Session scroll shell: the old bg-gray-50 fill (gray ramp step 1) on the
   RN ScrollView, with content padding on the inner stack. */
const scrollStyle = {
  flex: 1,
  backgroundColor: tokens.colors.gray.gray1,
} as const;

/* Cancel-session row keeps the RN TouchableOpacity so its disabled state
   matches the old pressable exactly (Stage 3b micro-action precedent);
   margin/opacity are token/state values. */
const cancelSessionStyle = (disabled: boolean) =>
  ({
    marginBottom: tokens.spacing[8],
    opacity: disabled ? 0.5 : undefined,
  }) as const;

// Field backgrounds (issue #167): fields here render through @spudly/ui
// components, which all share the Warm Harvest $surface field background.
// The web mirror matches via its bg-field token (#fffdf8, the same surface).
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
    <YStack
      key={`${message.role}-${index}`}
      marginStart={message.role === 'user' ? '$8' : undefined}
      marginEnd={message.role === 'user' ? undefined : '$8'}
      borderRadius={tokens.radii.md}
      backgroundColor={
        message.role === 'user' ? tokens.colors.gray.gray2 : '$primarySubtle'
      }
      padding="$3"
    >
      <DsText
        marginBlockEnd="$1"
        fontSize={tokens.typography.fontSize.xs}
        fontWeight={tokens.typography.fontWeight.semibold}
        color={tokens.colors.gray.gray6}
        textTransform="uppercase"
      >
        {message.role === 'user' ? 'You' : 'Plan'}
      </DsText>
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.gray.gray9}
      >
        {message.content}
      </DsText>
    </YStack>
  );

  if (!session) {
    return (
      <YStack
        flex={1}
        backgroundColor={tokens.colors.gray.gray1}
        paddingHorizontal="$4"
        paddingBlockStart="$4"
      >
        <DsText
          marginBlockEnd="$2"
          fontSize={tokens.typography.fontSize['2xl']}
          fontWeight={tokens.typography.fontWeight.bold}
          color={tokens.colors.gray.gray10}
        >
          {config.title}
        </DsText>
        <DsText
          color="$textMuted"
          marginBlockEnd="$6"
          fontSize={tokens.typography.fontSize.sm}
        >
          {config.intro}
        </DsText>
        {/* min-block-48 (192) kept as geometry on the DS field */}
        <DsMultilineField
          marginBlockEnd="$4"
          minHeight={192}
          placeholder={config.promptPlaceholder}
          value={prompt}
          onChangeText={setPrompt}
          textAlignVertical="top"
        />
        {error ? (
          <DsText
            variant="error"
            marginBlockEnd="$4"
          >
            {error}
          </DsText>
        ) : null}
        <XStack gap="$3">
          <DsButton
            variant="outlined"
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray8}
            onPress={onEmptyCancel}
          >
            Cancel
          </DsButton>
          <DsButton
            variant="primary"
            flex={1}
            disabled={busy || prompt.trim().length === 0}
            onPress={() => {
              startMutation.mutate(prompt.trim());
            }}
          >
            {startMutation.isPending
              ? config.startPendingLabel
              : config.startLabel}
          </DsButton>
        </XStack>
      </YStack>
    );
  }

  return (
    <ScrollView style={scrollStyle}>
      <YStack
        paddingHorizontal="$4"
        paddingBlockStart="$4"
      >
        <DsText
          marginBlockEnd="$2"
          fontSize={tokens.typography.fontSize['2xl']}
          fontWeight={tokens.typography.fontWeight.bold}
          color={tokens.colors.gray.gray10}
        >
          {config.title}
        </DsText>
        <DsText
          color="$textMuted"
          marginBlockEnd="$4"
          fontSize={tokens.typography.fontSize.sm}
        >
          {config.phaseLabel(session.phase)}
        </DsText>
        <YStack
          marginBlockEnd="$4"
          gap="$3"
        >
          {session.messages.map(renderMessage)}
        </YStack>
        {session.phase === 'planning' ? (
          <YStack
            marginBlockEnd="$4"
            gap="$3"
          >
            {/* min-block-24 (96) kept as geometry on the DS field */}
            <DsMultilineField
              minHeight={96}
              placeholder="Ask for changes to the plan…"
              value={followUp}
              onChangeText={setFollowUp}
              textAlignVertical="top"
            />
            <XStack
              flexWrap="wrap"
              gap="$2"
            >
              <DsButton
                variant="outlined"
                size="sm"
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.gray.gray8}
                disabled={busy || followUp.trim().length === 0}
                onPress={() => {
                  messageMutation.mutate({
                    sessionId: session.id,
                    content: followUp.trim(),
                  });
                }}
              >
                Refine plan
              </DsButton>
              <DsButton
                variant="primary"
                size="sm"
                disabled={busy}
                onPress={() => {
                  approvePlanMutation.mutate(session.id);
                }}
              >
                {approvePlanMutation.isPending
                  ? 'Building preview…'
                  : 'Approve plan'}
              </DsButton>
            </XStack>
          </YStack>
        ) : null}
        {session.phase === 'preview_ready' && previewRecipe ? (
          <YStack
            marginBlockEnd="$4"
            borderRadius={tokens.radii.lg}
            borderWidth={1}
            borderColor={tokens.colors.gray.gray3}
            backgroundColor="$surface"
            padding="$4"
          >
            <DsText
              marginBlockEnd="$3"
              fontSize={tokens.typography.fontSize.sm}
              fontWeight={tokens.typography.fontWeight.semibold}
              color={tokens.colors.gray.gray10}
            >
              {config.previewTitle}
            </DsText>
            <RecipeInputPreview recipe={previewRecipe} />
            <DsButton
              variant="primary"
              marginBlockStart="$4"
              disabled={busy}
              onPress={() => {
                finalizeMutation.mutate(session.id);
              }}
            >
              {finalizeMutation.isPending
                ? config.finalizePendingLabel
                : config.finalizeLabel}
            </DsButton>
          </YStack>
        ) : null}
        {error ? (
          <DsText
            variant="error"
            marginBlockEnd="$4"
          >
            {error}
          </DsText>
        ) : null}
        {session.phase !== 'completed' && session.phase !== 'cancelled' ? (
          <TouchableOpacity
            style={cancelSessionStyle(busy)}
            disabled={busy}
            onPress={() => {
              cancelMutation.mutate(session.id);
            }}
          >
            <DsText
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.gray.gray6}
              textDecorationLine="underline"
            >
              Cancel session
            </DsText>
          </TouchableOpacity>
        ) : null}
      </YStack>
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
