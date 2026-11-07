import {PayPage as PayPageView, type PayPageStatus} from '@spudly/ui';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import type {PaddleEvent} from '../lib/paddle.js';
import {
  closeCheckout,
  initializePaddle,
  isPaddleConfigured,
  releasePaddle,
} from '../lib/paddle.js';

type PayStatus = Extract<PayPageStatus, 'opening' | 'closed' | 'error'>;

/**
 * Checkout completion page — the target of Paddle's "default payment link".
 * Paddle sends buyers here with a `_ptxn` transaction parameter (checkout
 * links, failed-renewal retries); initializing Paddle.js makes it open that
 * transaction's checkout overlay automatically. On completion the buyer lands
 * on their profile, where the new plan is in effect via the webhook-driven
 * entitlement.
 *
 * The DS PayPage renders the surface; this host keeps the provider session: it
 * opens the checkout window from the transaction it was handed and reports the
 * outcome as the page's `status` union. The way out of the terminal states is a
 * reload (re-running initialization), and home is the page's `homeHref` because
 * it navigates.
 */
export const PayPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const transactionId = searchParams.get('_ptxn');
  const configured = isPaddleConfigured();
  const [status, setStatus] = useState<PayStatus>('opening');

  useEffect(() => {
    if (!transactionId || !configured) {
      return;
    }
    // Each mount registers its own handler and releases it on cleanup, so
    // StrictMode effect replay (setup, cleanup, setup) and transaction
    // changes always leave a live handler behind — never a cancelled one.
    let active = true;
    setStatus('opening');
    const onEvent = (event: PaddleEvent) => {
      if (!active) {
        return;
      }
      switch (event.name) {
        case 'checkout.completed': {
          // The overlay lives outside the React tree; dismiss it first or
          // it keeps covering the profile page after navigation.
          closeCheckout();
          void navigate('/profile', {replace: true});
          break;
        }
        case 'checkout.closed': {
          setStatus('closed');
          break;
        }
        case 'checkout.error': {
          setStatus('error');
          break;
        }
        default: {
          break;
        }
      }
    };
    initializePaddle(transactionId, onEvent).catch(() => {
      if (active) {
        setStatus('error');
      }
    });
    return () => {
      active = false;
      releasePaddle(onEvent);
    };
  }, [transactionId, configured, navigate]);

  const pageStatus: PayPageStatus = !configured
    ? 'unconfigured'
    : transactionId === null
      ? 'needs-transaction'
      : status;

  return (
    <PayPageView
      status={pageStatus}
      onRetryPress={() => {
        window.location.reload();
      }}
      homeHref="/"
      homeLabel="Go to Eciperay home"
    />
  );
};
