/* eslint-disable max-lines -- shared conversational AI session UI */
import {errorMessage, parseProposedRecipe} from '@eciperay/client';
import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
import type {TweakAiMessage, TweakAiPhase} from '@eciperay/types';

import {RecipeInputPreview} from '../recipe/RecipeInputPreview.js';

export type AiSessionState = {
  id: string;
  phase: TweakAiPhase;
  messages: TweakAiMessage[];
  proposedRecipe: Record<string, unknown> | null;
};

type AiSessionFlowConfig = {
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
    <div
      key={`${message.role}-${index}`}
      className={
        message.role === 'user'
          ? 'ms-8 rounded-lg bg-gray-100 p-3 text-sm text-gray-800'
          : 'me-8 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950'
      }
    >
      <p
        className="
          mbe-1 text-xs font-semibold tracking-wide uppercase opacity-70
        "
      >
        {message.role === 'user' ? 'You' : 'Plan'}
      </p>
      <p className="whitespace-pre-wrap">{message.content}</p>
    </div>
  );

  if (!session) {
    return (
      <div>
        <h1 className="mbe-2 text-2xl font-bold text-gray-900">
          {config.title}
        </h1>
        <p className="text-muted mbe-6 text-sm">{config.intro}</p>
        <form
          onSubmit={e => {
            e.preventDefault();
            setError(null);
            startMutation.mutate(prompt.trim());
          }}
          className="space-y-4"
        >
          <textarea
            required
            rows={6}
            className="rounded-lg border border-gray-300 bg-field px-4 py-3 inline-full"
            placeholder={config.promptPlaceholder}
            value={prompt}
            onChange={e => {
              setPrompt(e.target.value);
            }}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="button"
              className="
                rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium
                text-gray-700
              "
              onClick={onEmptyCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || prompt.trim().length === 0}
              className="
                bg-primary flex-1 rounded-lg py-3 font-semibold text-white
                disabled:opacity-50
              "
            >
              {startMutation.isPending
                ? config.startPendingLabel
                : config.startLabel}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mbe-2 text-2xl font-bold text-gray-900">
          {config.title}
        </h1>
        <p className="text-muted text-sm">{config.phaseLabel(session.phase)}</p>
      </div>
      <div className="space-y-3">{session.messages.map(renderMessage)}</div>
      {session.phase === 'planning' ? (
        <form
          onSubmit={e => {
            e.preventDefault();
            setError(null);
            messageMutation.mutate({
              sessionId: session.id,
              content: followUp.trim(),
            });
          }}
          className="space-y-3"
        >
          <textarea
            rows={3}
            className="rounded-lg border border-gray-300 bg-field px-4 py-3 inline-full"
            placeholder="Ask for changes to the plan…"
            value={followUp}
            onChange={e => {
              setFollowUp(e.target.value);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || followUp.trim().length === 0}
              className="
                rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium
                text-gray-700
                disabled:opacity-50
              "
            >
              {messageMutation.isPending ? 'Sending…' : 'Refine plan'}
            </button>
            <button
              type="button"
              disabled={busy}
              className="
                rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium
                text-white
                disabled:opacity-50
              "
              onClick={() => {
                approvePlanMutation.mutate(session.id);
              }}
            >
              {approvePlanMutation.isPending
                ? 'Building preview…'
                : 'Approve plan'}
            </button>
          </div>
        </form>
      ) : null}
      {session.phase === 'preview_ready' && previewRecipe ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mbe-3 text-sm font-semibold text-gray-900">
            {config.previewTitle}
          </p>
          <RecipeInputPreview recipe={previewRecipe} />
          <button
            type="button"
            disabled={busy}
            className="
              bg-primary mbs-4 rounded-lg px-4 py-3 text-sm font-semibold
              text-white
              disabled:opacity-50
            "
            onClick={() => {
              finalizeMutation.mutate(session.id);
            }}
          >
            {finalizeMutation.isPending
              ? config.finalizePendingLabel
              : config.finalizeLabel}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {session.phase !== 'completed' && session.phase !== 'cancelled' ? (
        <button
          type="button"
          disabled={busy}
          className="
            text-sm text-gray-500 underline
            disabled:opacity-50
          "
          onClick={() => {
            cancelMutation.mutate(session.id);
          }}
        >
          Cancel session
        </button>
      ) : null}
    </div>
  );
};
