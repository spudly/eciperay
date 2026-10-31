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

const clearStoredSessionId = (storageKey: string, sessionId: string) => {
  try {
    // Clear only the id that finished: another tab may already have
    // stored a newer session's id under the same key, and removing that
    // would lose the newer session's restore pointer.
    if (localStorage.getItem(storageKey) === sessionId) {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // Nothing to clear if storage is unavailable.
  }
};

const isTerminalPhase = (phase: TweakAiPhase) =>
  phase === 'completed' || phase === 'cancelled';

/**
 * Upper bound for one session-restore GET. Generous for a single-record fetch;
 * its only job is to keep a stalled request from wedging the host's busy state
 * forever.
 */
const RESTORE_TIMEOUT_MS = 30_000;

type SharedStart = {
  promise: Promise<{session: AiSessionState}>;
  /**
   * False once a newer start for the same storage key has begun: a late
   * completion of a superseded start must not store its session id or surface
   * its session over the newer one.
   */
  current: boolean;
};

/**
 * Starts in flight, shared across AiSessionHost instances by storage key. A
 * start outlives the host instance that began it: navigating away unmounts that
 * host, and the host that mounts in its place adopts the pending start here
 * instead of reading a stored id that does not exist yet (ids are stored only
 * when a start completes).
 */
const sharedStarts = new Map<string, SharedStart>();

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
  // True while this host waits on a start begun by a previous instance
  // of the same flow (see the adoption effect below).
  const [sharedStartPending, setSharedStartPending] = useState(false);

  // Restore a session left in progress by a previous visit to this page:
  // the id was persisted when the session last changed, and the session
  // itself is re-fetched from the server, which is its source of truth.
  // A mutation (not a query) does the fetch on purpose: mutations never
  // read the shared QueryClient cache, so a session restored here always
  // comes from a fresh, ownership-checked server response — the server
  // 404s sessions owned by another account — and can never be the
  // previous account's cached copy after a sign-out/sign-in switch.
  const [storedSessionId] = useState(() => readStoredSessionId(storageKey));
  // The restore this host most recently needs, callable from the
  // mutation's own onSuccess (the mutate function is assigned to this
  // ref by the effect below, before any restore can settle).
  const restoreSessionRef = useRef<(sessionId: string) => void>(() => {});
  const restoreMutation = useMutation({
    // A restore is a single-record GET: if it stalls, the host must
    // not stay busy forever with no way to start over. The timeout
    // rejects the restore (the stored id is kept — a timeout is not a
    // definitive not-found — so a later visit can retry), the busy
    // state lifts, and the stalled response, if it ever arrives, is
    // ignored: an unverified session is never displayed.
    mutationFn: (sessionId: string) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Session restore timed out'));
        }, RESTORE_TIMEOUT_MS);
      });
      return Promise.race([api.get(sessionId), timeout]).finally(() => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    },
    onSuccess: result => {
      const restored = result.session;
      // A newer session may have started (and stored its id) while
      // this restore was in flight — e.g. a second start begun in the
      // gap after an adopted start resolved. The stored pointer names
      // the session that should be visible; a restore for any other
      // id is superseded and must not replace it. Restore the session
      // the pointer names now instead of dropping to the fresh form:
      // left there, the newer session would never be fetched, and
      // starting another session would overwrite its pointer.
      const currentStoredId = readStoredSessionId(storageKey);
      if (currentStoredId !== null && currentStoredId !== restored.id) {
        restoreSessionRef.current(currentStoredId);
        return;
      }
      if (isTerminalPhase(restored.phase)) {
        clearStoredSessionId(storageKey, restored.id);
      } else {
        setSession(restored);
      }
    },
    onError: (error_, sessionId) => {
      // A definitive not-found (the server's 404 for a deleted, expired,
      // or another account's session) drops the stored id silently and
      // starts fresh. Any other failure (5xx, network) may be transient:
      // keep the id so a later visit can still restore the session.
      const message = error_ instanceof Error ? error_.message : '';
      if (message === 'Session not found' || message === 'Recipe not found') {
        clearStoredSessionId(storageKey, sessionId);
      }
    },
  });
  const {mutate: restoreSession} = restoreMutation;
  useEffect(() => {
    restoreSessionRef.current = restoreSession;
  }, [restoreSession]);
  const restoreFired = useRef(false);
  useEffect(() => {
    if (storedSessionId === null || restoreFired.current) {
      return;
    }
    restoreFired.current = true;
    restoreSession(storedSessionId);
  }, [storedSessionId, restoreSession]);

  // Adopt a start that was still in flight when the previous host
  // instance unmounted (the user navigated away and back mid-start):
  // no id is stored yet, so the restore above has nothing to fetch.
  // When the shared start completes, this host stores the id — but it
  // displays the session only through the owner-scoped restore above,
  // never from the start result directly: the shared-starts map is
  // module-level and survives a sign-out/sign-in switch in this SPA,
  // so a start begun under a previous account could otherwise be shown
  // to the new account. The restore fetch is ownership-checked by the
  // server (it 404s another account's session, which drops the stored
  // id and leaves the fresh form). If the start fails, the originating
  // host surfaces the error; this host simply returns to the fresh form.
  const adoptFired = useRef(false);
  useEffect(() => {
    if (storedSessionId !== null || adoptFired.current) {
      return;
    }
    adoptFired.current = true;
    const shared = sharedStarts.get(storageKey);
    if (!shared) {
      return;
    }
    setSharedStartPending(true);
    shared.promise.then(
      result => {
        setSharedStartPending(false);
        if (!shared.current) {
          return;
        }
        storeSessionId(storageKey, result.session.id);
        setError(null);
        restoreSession(result.session.id);
      },
      () => {
        setSharedStartPending(false);
      },
    );
  }, [storedSessionId, storageKey, restoreSession]);

  // The stored id is written once, when a session starts (see
  // startMutation below): a session's id never changes during its life,
  // and writing on every session update would let an older tab refining
  // its session clobber the restore pointer of a newer session started
  // in another tab. This effect only clears the pointer if a session
  // reaches a terminal phase through an update.
  useEffect(() => {
    if (session && isTerminalPhase(session.phase)) {
      clearStoredSessionId(storageKey, session.id);
    }
  }, [session, storageKey]);

  // The start this host most recently began, so its completion can be
  // told apart from a superseded start's late completion.
  const ownStart = useRef<SharedStart | null>(null);
  const startMutation = useMutation({
    mutationFn: (text: string) => {
      // Beginning a start supersedes any earlier start for this flow:
      // its late completion must not overwrite this start's session.
      const previous = sharedStarts.get(storageKey);
      if (previous) {
        previous.current = false;
      }
      const shared: SharedStart = {promise: api.start(text), current: true};
      ownStart.current = shared;
      sharedStarts.set(storageKey, shared);
      const forget = () => {
        if (sharedStarts.get(storageKey) === shared) {
          sharedStarts.delete(storageKey);
        }
      };
      shared.promise.then(forget, forget);
      return shared.promise;
    },
    onSuccess: result => {
      // A newer start began while this one was in flight: leave the
      // stored id and the visible session to the newer start.
      if (ownStart.current && !ownStart.current.current) {
        return;
      }
      storeSessionId(storageKey, result.session.id);
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
    onSuccess: async (result, sessionId) => {
      clearStoredSessionId(storageKey, sessionId);
      await onFinalizeSuccess(result);
    },
    onError: error_ => {
      setError(errorMessage(error_));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => api.cancel(sessionId),
    onSuccess: (_result, sessionId) => {
      clearStoredSessionId(storageKey, sessionId);
      onCancelSuccess();
    },
  });

  // Every pending restore counts toward busy — including the restore
  // an adopting host fires for a session id it never had in storage
  // (storedSessionId is null there): until that fetch settles, the
  // fresh form must not accept a second start that the older restore
  // response could then overwrite.
  const busy =
    restoreMutation.isPending ||
    sharedStartPending ||
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
      startPending={startMutation.isPending || sharedStartPending}
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
