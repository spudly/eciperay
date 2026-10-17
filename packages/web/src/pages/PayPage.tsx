import {useEffect, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {EmptyMessage} from '../components/ui/EmptyMessage.js';
import {PageTitle} from '../components/ui/PageTitle.js';
import {PrimaryButton} from '../components/ui/PrimaryButton.js';
import {ScreenContainer} from '../components/ui/ScreenContainer.js';
import {initializePaddle, isPaddleConfigured} from '../lib/paddle.js';

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
  const startedRef = useRef(false);

  useEffect(() => {
    if (!transactionId || !configured || startedRef.current) {
      return;
    }
    startedRef.current = true;
    let cancelled = false;
    initializePaddle(event => {
      if (cancelled) {
        return;
      }
      switch (event.name) {
        case 'checkout.completed': {
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
    }).catch(() => {
      if (!cancelled) {
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [transactionId, configured, navigate]);

  return (
    <ScreenContainer variant="padded">
      <PageTitle>Checkout</PageTitle>
      {configured ? (
        transactionId ? (
          status === 'error' ? (
            <>
              <EmptyMessage>
                The payment window couldn’t be opened. Check your connection and
                try again.
              </EmptyMessage>
              <PrimaryButton
                label="Try again"
                onPress={() => {
                  window.location.reload();
                }}
              />
            </>
          ) : status === 'closed' ? (
            <>
              <EmptyMessage>
                The payment window was closed before the purchase finished.
              </EmptyMessage>
              <PrimaryButton
                label="Reopen checkout"
                onPress={() => {
                  window.location.reload();
                }}
              />
            </>
          ) : (
            <EmptyMessage>Opening the secure payment window…</EmptyMessage>
          )
        ) : (
          <>
            <EmptyMessage>
              This page completes a purchase started somewhere else — it needs
              the checkout link from that purchase to open a payment window.
            </EmptyMessage>
            <PrimaryButton
              label="Go to Eciperay home"
              onPress={() => {
                void navigate('/');
              }}
            />
          </>
        )
      ) : (
        <EmptyMessage>
          Checkout isn’t configured yet, so there’s nothing to pay for here.
        </EmptyMessage>
      )}
    </ScreenContainer>
  );
};
