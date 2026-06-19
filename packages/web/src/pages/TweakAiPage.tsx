/* eslint-disable max-lines -- conversational tweak UI */
import {errorMessage, invalidateRecipeQueries} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import type {TweakAiMessage, TweakAiSession} from '@eciperay/types';

import {eciperay} from '../lib/api.js';

const PROMPT_PLACEHOLDER =
  'e.g. make it vegetarian, reduce sugar, add more spice';

const phaseLabel = (phase: TweakAiSession['phase']) => {
  switch (phase) {
    case 'planning': {
      return 'Review the plan and refine it, or approve to continue.';
    }
    case 'plan_approved': {
      return 'Plan approved — generate a draft preview next.';
    }
    case 'preview_ready': {
      return 'Preview ready — save as a draft version or go back to refine.';
    }
    case 'completed': {
      return 'Draft saved.';
    }
    default: {
      return '';
    }
  }
};

export const TweakAiPage = () => {
  const {recipeId = ''} = useParams();
  const [prompt, setPrompt] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [session, setSession] = useState<TweakAiSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (text: string) => eciperay.tweakAi.start(recipeId, text),
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
      eciperay.tweakAi.sendMessage(recipeId, sessionId, content),
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
      eciperay.tweakAi.approvePlan(recipeId, sessionId),
    onSuccess: result => {
      setSession(result.session);
      setError(null);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const implementMutation = useMutation({
    mutationFn: (sessionId: string) =>
      eciperay.tweakAi.implement(recipeId, sessionId),
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
      eciperay.tweakAi.createVersion(recipeId, sessionId),
    onSuccess: async result => {
      await invalidateRecipeQueries(queryClient, recipeId, result.versionId);
      void navigate(`/recipes/${recipeId}?versionId=${result.versionId}`);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) =>
      eciperay.tweakAi.cancel(recipeId, sessionId),
    onSuccess: () => {
      void navigate(`/recipes/${recipeId}`);
    },
  });

  const busy =
    startMutation.isPending ||
    messageMutation.isPending ||
    approvePlanMutation.isPending ||
    implementMutation.isPending ||
    createVersionMutation.isPending;

  const handleStart = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError(null);
    startMutation.mutate(prompt.trim());
  };

  const handleFollowUp =
    (activeSession: TweakAiSession) => (e: React.SubmitEvent) => {
      e.preventDefault();
      setError(null);
      messageMutation.mutate({
        sessionId: activeSession.id,
        content: followUp.trim(),
      });
    };

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
          mb-1 text-xs font-semibold uppercase tracking-wide opacity-70
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Tweak with AI</h1>
        <p className="text-muted mb-6 text-sm">
          Describe how you want to change this recipe. AI will propose a plan
          for you to review before creating a draft.
        </p>
        <form
          onSubmit={handleStart}
          className="space-y-4"
        >
          <textarea
            required
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
            placeholder={PROMPT_PLACEHOLDER}
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
              onClick={() => {
                void navigate(`/recipes/${recipeId}`);
              }}
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
              {startMutation.isPending ? 'Planning…' : 'Start planning'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Tweak with AI</h1>
        <p className="text-muted text-sm">{phaseLabel(session.phase)}</p>
      </div>
      <div className="space-y-3">{session.messages.map(renderMessage)}</div>
      {session.phase === 'planning' ? (
        <form
          onSubmit={handleFollowUp(session)}
          className="space-y-3"
        >
          <textarea
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
              {approvePlanMutation.isPending ? 'Approving…' : 'Approve plan'}
            </button>
          </div>
        </form>
      ) : null}
      {session.phase === 'plan_approved' ? (
        <button
          type="button"
          disabled={busy}
          className="
            bg-primary rounded-lg px-4 py-3 text-sm font-semibold text-white
            disabled:opacity-50
          "
          onClick={() => {
            implementMutation.mutate(session.id);
          }}
        >
          {implementMutation.isPending
            ? 'Generating preview…'
            : 'Generate preview'}
        </button>
      ) : null}
      {session.phase === 'preview_ready' && session.proposedRecipe ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">
            Draft preview
          </p>
          <p className="text-sm text-gray-700">
            {(session.proposedRecipe as {title?: string}).title ??
              'Updated recipe'}
          </p>
          <p className="text-muted mt-1 text-xs">
            {(session.proposedRecipe as {ingredients?: unknown[]}).ingredients
              ?.length ?? 0}{' '}
            ingredients,{' '}
            {(session.proposedRecipe as {instructions?: unknown[]}).instructions
              ?.length ?? 0}{' '}
            steps
          </p>
          <button
            type="button"
            disabled={busy}
            className="
              bg-primary mt-4 rounded-lg px-4 py-3 text-sm font-semibold
              text-white
              disabled:opacity-50
            "
            onClick={() => {
              createVersionMutation.mutate(session.id);
            }}
          >
            {createVersionMutation.isPending ? 'Saving…' : 'Save as draft'}
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
