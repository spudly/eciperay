import {errorMessage, parseProposedRecipe} from '@eciperay/client';
import {useMutation} from '@tanstack/react-query';
import {useEffect, useRef, useState} from 'react';
import type {TweakAiMessage, TweakAiPhase} from '@eciperay/types';

import {AiSessionPage} from '@spudly/ui/pages';

import {RecipeInputPreview} from '../components/recipe/RecipeInputPreview.js';

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
  get: (sessionId: string) => Promise<{session: AiSessionState}>;
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
  /**
   * LocalStorage key under which the active session's id is persisted so
   * navigating away and back restores the in-progress session (#295). Each flow
   * (generate, tweak per recipe) passes its own key.
   */
  storageKey: string;
  onEmptyCancel: () => void;
  onFinalizeSuccess: (result: unknown) => void | Promise<void>;
  onCancelSuccess: () => void;
};

const readStoredSessionId = (storageKey: string): string | null => {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

const storeSessionId = (storageKey: string, sessionId: string) => {
  try {
    localStorage.setItem(storageKey, sessionId);
  } catch {
    // Storage unavailable (private mode / quota): the session simply
    // will not survive navigation, matching the pre-#295 behavior.
  }
};

const clearStoredSessionId = (storageKey: string) => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
};

const isTerminalPhase = (phase: TweakAiPhase) =>
  phase === 'completed' || phase === 'cancelled';

/**
 * Web host for the design system AiSessionPage (B7 cluster C4): keeps the
 * session state machine, the five session mutations, and error mapping
 * web-side; the page renders the session view-model and reports intents.
 */
export const AiSessionHost = ({
  config,
  api,
  storageKey,
  onEmptyCancel,
  onFinalizeSuccess,
  onCancelSuccess,
}: Props) => {
  const [prompt, setPrompt] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [session, setSession] = useState<AiSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore a session left in progress by a previous visit to this page:
  // the id was persisted when the session last changed, and the session
  // itself is re-fetched from the server, which is its source of truth.
  // A mutation (not a query) does the fetch on purpose: mutations never
  // read the shared QueryClient cache, so a session restored here always
  // comes from a fresh, ownership-checked server response — the server
  // 404s sessions owned by another account — and can never be the
  // previous account's cached copy after a sign-out/sign-in switch.
  const [storedSessionId] = useState(() => readStoredSessionId(storageKey));
  const restoreMutation = useMutation({
    mutationFn: (sessionId: string) => api.get(sessionId),
    onSuccess: result => {
      const restored = result.session;
      if (isTerminalPhase(restored.phase)) {
        clearStoredSessionId(storageKey);
      } else {
        setSession(restored);
      }
    },
    onError: error_ => {
      // A definitive not-found (the server's 404 for a deleted, expired,
      // or another account's session) drops the stored id silently and
      // starts fresh. Any other failure (5xx, network) may be transient:
      // keep the id so a later visit can still restore the session.
      const message = error_ instanceof Error ? error_.message : '';
      if (message === 'Session not found' || message === 'Recipe not found') {
        clearStoredSessionId(storageKey);
      }
    },
  });
  const {mutate: restoreSession} = restoreMutation;
  const restoreFired = useRef(false);
  useEffect(() => {
    if (storedSessionId === null || restoreFired.current) {
      return;
    }
    restoreFired.current = true;
    restoreSession(storedSessionId);
  }, [storedSessionId, restoreSession]);

  // Persist the active session's id whenever it changes; terminal
  // sessions are not resumable, so their ids are cleared instead.
  useEffect(() => {
    if (!session) {
      return;
    }
    if (isTerminalPhase(session.phase)) {
      clearStoredSessionId(storageKey);
    } else {
      storeSessionId(storageKey, session.id);
    }
  }, [session, storageKey]);

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
      clearStoredSessionId(storageKey);
      await onFinalizeSuccess(result);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => api.cancel(sessionId),
    onSuccess: () => {
      clearStoredSessionId(storageKey);
      onCancelSuccess();
    },
  });

  const busy =
    (storedSessionId !== null && restoreMutation.isPending) ||
    startMutation.isPending ||
    messageMutation.isPending ||
    approvePlanMutation.isPending ||
    finalizeMutation.isPending;

  const previewRecipe =
    session?.phase === 'preview_ready' && session.proposedRecipe
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
                session.phase !== 'completed' && session.phase !== 'cancelled',
            }
          : null
      }
      preview={
        previewRecipe ? (
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
        setError(null);
        startMutation.mutate(text.trim());
      }}
      onSendMessage={text => {
        if (!session) {
          return;
        }
        setError(null);
        messageMutation.mutate({sessionId: session.id, content: text.trim()});
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
