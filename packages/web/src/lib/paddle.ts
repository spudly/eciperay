import {PADDLE_CLIENT_TOKEN, PADDLE_ENVIRONMENT} from './env.js';

/**
 * Minimal typed wrapper around Paddle.js (Paddle Billing), loaded from Paddle's
 * CDN at runtime — no npm dependency. The client-side token is a public browser
 * identifier (it ships in every page load), not a secret; the secret API key
 * never leaves the server.
 */

export type PaddleEvent = {name?: string; data?: unknown};

type PaddleGlobal = {
  Environment: {set: (environment: string) => void};
  Initialize: (options: {
    token: string;
    eventCallback?: (event: PaddleEvent) => void;
  }) => void;
};

type WindowWithPaddle = Window & {Paddle?: PaddleGlobal};

const paddleGlobal = (): PaddleGlobal | undefined =>
  (window as WindowWithPaddle).Paddle;

const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

let loadPromise: Promise<PaddleGlobal> | null = null;

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

/**
 * Initialize Paddle.js for this page load. When the page URL carries a `_ptxn`
 * transaction parameter (the shape of Paddle's default payment link), Paddle.js
 * opens that transaction's checkout overlay itself once initialized — no
 * explicit Checkout.open call is needed.
 */
export const initializePaddle = async (
  eventCallback: (event: PaddleEvent) => void,
): Promise<void> => {
  const paddle = await loadPaddleJs();
  if (PADDLE_ENVIRONMENT === 'sandbox') {
    paddle.Environment.set('sandbox');
  }
  paddle.Initialize({token: PADDLE_CLIENT_TOKEN, eventCallback});
};
