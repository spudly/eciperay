import {Button, ScreenContainer, SectionCard, Text as DSText} from '@spudly/ui';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {BookLoadingSpinner} from '../components/ui/BookLoadingSpinner.js';
import type {PaddleEvent} from '../lib/paddle.js';
import {
  closeCheckout,
  initializePaddle,
  isPaddleConfigured,
  releasePaddle,
} from '../lib/paddle.js';

type PayStatus = 'opening' | 'closed' | 'error';

/**
 * Checkout completion page — the target of Paddle's "default payment link".
 * Paddle sends buyers here with a `_ptxn` transaction parameter (checkout
 * links, failed-renewal retries); initializing Paddle.js makes it open that
 * transaction's checkout overlay automatically. On completion the buyer lands
 * on their profile, where the new plan is in effect via the webhook-driven
 * entitlement.
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

  const inCheckoutFlow = configured && transactionId !== null;

  return (
    <ScreenContainer variant="padded">
      <div style={{maxWidth: 480, margin: '0 auto'}}>
        <div
          style={{display: 'flex', justifyContent: 'center', marginBottom: 24}}
        >
          <img
            src="/logo-horizontal.svg"
            alt="Eciperay"
            style={{height: 44}}
          />
        </div>
        <SectionCard
          title={inCheckoutFlow ? 'Complete your purchase' : 'Checkout'}
          variant="elevated"
        >
          {configured ? (
            transactionId ? (
              status === 'error' ? (
                <>
                  <DSText>
                    The payment window couldn’t be opened. Check your connection
                    and try again.
                  </DSText>
                  <Button
                    variant="primary"
                    onPress={() => {
                      window.location.reload();
                    }}
                  >
                    Try again
                  </Button>
                </>
              ) : status === 'closed' ? (
                <>
                  <DSText>
                    The payment window was closed before the purchase finished.
                  </DSText>
                  <Button
                    variant="primary"
                    onPress={() => {
                      window.location.reload();
                    }}
                  >
                    Reopen checkout
                  </Button>
                </>
              ) : (
                <>
                  <BookLoadingSpinner />
                  <DSText>Opening the secure payment window…</DSText>
                </>
              )
            ) : (
              <>
                <DSText>
                  This page completes a purchase started somewhere else — it
                  needs the checkout link from that purchase to open a payment
                  window.
                </DSText>
                <Button
                  variant="primary"
                  onPress={() => {
                    void navigate('/');
                  }}
                >
                  Go to Eciperay home
                </Button>
              </>
            )
          ) : (
            <DSText>
              Checkout isn’t configured yet, so there’s nothing to pay for here.
            </DSText>
          )}
        </SectionCard>
      </div>
    </ScreenContainer>
  );
};
