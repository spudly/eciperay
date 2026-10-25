import {errorMessage, parseProposedRecipe} from '@eciperay/client';
import {AiSessionPage} from '@spudly/ui/pages';
import {useMutation} from '@tanstack/react-query';
import React, {useState} from 'react';
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

/**
 * Host for the design system AiSessionPage (design-system#126): this
 * component keeps the session state machine, the five session
 * mutations, and the error mapping, and maps the session to the
 * page's view-model — the phase resolved to its label string, the
 * stage booleans derived from the phase, and the parsed proposed
 * recipe rendered through RecipeInputPreview into the page's preview
 * slot. The page renders display state and reports bare intents;
 * the trims the old view applied before mutating happen here, at
 * the same call sites.
 */
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

  return (
    <AiSessionPage
      config={{
        title: config.title,
        intro: config.intro,
        promptPlaceholder: config.promptPlaceholder,
        startLabel: config.startLabel,
        startPendingLabel: config.startPendingLabel,
        previewTitle: config.previewTitle,
        finalizeLabel: config.finalizeLabel,
        finalizePendingLabel: config.finalizePendingLabel,
      }}
      session={
        session
          ? {
              phaseLabel: config.phaseLabel(session.phase),
              messages: session.messages,
              canRefine: session.phase === 'planning',
              canCancel:
                session.phase !== 'completed' &&
                session.phase !== 'cancelled',
            }
          : null
      }
      preview={
        session?.phase === 'preview_ready' && previewRecipe ? (
          <RecipeInputPreview recipe={previewRecipe} />
        ) : undefined
      }
      prompt={prompt}
      onPromptChange={setPrompt}
      followUp={followUp}
      onFollowUpChange={setFollowUp}
      busy={busy}
      startPending={startMutation.isPending}
      approvePending={approvePlanMutation.isPending}
      finalizePending={finalizeMutation.isPending}
      error={error}
      onStart={text => {
        startMutation.mutate(text.trim());
      }}
      onSendMessage={text => {
        if (session) {
          messageMutation.mutate({
            sessionId: session.id,
            content: text.trim(),
          });
        }
      }}
      onApprovePlan={() => {
        if (session) {
          approvePlanMutation.mutate(session.id);
        }
      }}
      onFinalize={() => {
        if (session) {
          finalizeMutation.mutate(session.id);
        }
      }}
      onCancel={() => {
        if (session) {
          cancelMutation.mutate(session.id);
        }
      }}
      onEmptyCancel={onEmptyCancel}
    />
  );
};

