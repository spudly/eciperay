import {PADDLE_CLIENT_TOKEN, PADDLE_ENVIRONMENT} from './env.js';

/**
 * Minimal typed wrapper around Paddle.js (Paddle Billing), loaded from Paddle's
 * CDN at runtime — no npm dependency. The client-side token is a public browser
 * identifier (it ships in every page load), not a secret; the secret API key
 * never leaves the server.
 *
 * The SDK is initialized exactly once per page load, with a stable module-level
 * dispatcher as its event callback. Each /pay mount hands the dispatcher its
 * own handler via initializePaddle and releases it on unmount, so StrictMode
 * effect replay and client-side remounts never strand the live page without
 * handlers, and repeat visits open their transaction explicitly via
 * Checkout.open instead of re-initializing.
 */

export type PaddleEvent = {name?: string; data?: unknown};

type PaddleEventCallback = (event: PaddleEvent) => void;

type PaddleGlobal = {
  Environment: {set: (environment: string) => void};
  Initialize: (options: {
    token: string;
    eventCallback?: PaddleEventCallback;
  }) => void;
  Checkout: {open: (options: {transactionId: string}) => void};
};

type WindowWithPaddle = Window & {Paddle?: PaddleGlobal};

const paddleGlobal = (): PaddleGlobal | undefined =>
  (window as WindowWithPaddle).Paddle;

const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let loadPromise: Promise<PaddleGlobal> | null = null;
let sdkInitialized = false;
let currentCallback: PaddleEventCallback | null = null;

export const isPaddleConfigured = (): boolean => PADDLE_CLIENT_TOKEN.length > 0;

const loadPaddleJs = (): Promise<PaddleGlobal> => {
  const existing = paddleGlobal();
  if (existing) {
    return Promise.resolve(existing);
  }
  loadPromise ??= new Promise<PaddleGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_JS_URL;
    script.async = true;
    script.onload = () => {
      const paddle = paddleGlobal();
      if (paddle) {
        resolve(paddle);
      } else {
        reject(new Error('Paddle.js loaded without exposing window.Paddle'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Paddle.js'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
};

const dispatchEvent: PaddleEventCallback = event => {
  currentCallback?.(event);
};

/**
 * Make `eventCallback` the live checkout handler for `transactionId`. First
 * call: loads Paddle.js and initializes the SDK — Paddle.js then opens the
 * transaction named by the page URL's `_ptxn` parameter itself. Later calls
 * (remounts, a changed transaction): the SDK is already initialized, so the
 * requested transaction is opened explicitly.
 */
export const initializePaddle = async (
  transactionId: string,
  eventCallback: PaddleEventCallback,
): Promise<void> => {
  currentCallback = eventCallback;
  const paddle = await loadPaddleJs();
  if (sdkInitialized) {
    paddle.Checkout.open({transactionId});
    return;
  }
  if (PADDLE_ENVIRONMENT === 'sandbox') {
    paddle.Environment.set('sandbox');
  }
  paddle.Initialize({token: PADDLE_CLIENT_TOKEN, eventCallback: dispatchEvent});
  sdkInitialized = true;
};

/**
 * Detach a handler previously passed to initializePaddle (page unmount). Only
 * the currently-registered handler can detach itself, so an old page's cleanup
 * never silences the page that replaced it.
 */
export const releasePaddle = (eventCallback: PaddleEventCallback): void => {
  if (currentCallback === eventCallback) {
    currentCallback = null;
  }
};
