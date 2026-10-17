import {act, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes, useNavigate} from 'react-router-dom';
import {vi} from 'vitest';

import {
  closeCheckout,
  initializePaddle,
  isPaddleConfigured,
  releasePaddle,
} from '../lib/paddle.js';
import {renderWithProviders} from '../test/testUtils.js';

import {PayPage} from './PayPage.js';

vi.mock('../lib/paddle.js', () => ({
  closeCheckout: vi.fn(),
  isPaddleConfigured: vi.fn(),
  initializePaddle: vi.fn(),
  releasePaddle: vi.fn(),
}));

const mockConfigured = vi.mocked(isPaddleConfigured);
const mockInitialize = vi.mocked(initializePaddle);
const mockRelease = vi.mocked(releasePaddle);
const mockClose = vi.mocked(closeCheckout);

const callbackAt = (index: number) => mockInitialize.mock.calls[index]?.[1];

const renderPay = async (route: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/pay"
        element={<PayPage />}
      />
      <Route
        path="/profile"
        element={<div>Profile stub</div>}
      />
    </Routes>,
    {route, withAuth: false},
  );

describe('PayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockImplementation(async () => {});
  });

  test('reports when checkout is not configured', async () => {
    mockConfigured.mockReturnValue(false);
    await renderPay('/pay?_ptxn=txn_123');
    expect(screen.getByText(/isn’t configured yet/i)).toBeInTheDocument();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  test('explains itself when no transaction is in the URL', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay');
    expect(screen.getByText(/completes a purchase/i)).toBeInTheDocument();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  test('initializes Paddle and redirects to the profile on completion', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    expect(
      screen.getByText(/Opening the secure payment window/i),
    ).toBeInTheDocument();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledWith(
      'txn_123',
      expect.any(Function),
    );
    const onEvent = callbackAt(0);
    expect(typeof onEvent).toBe('function');
    await act(async () => {
      onEvent?.({name: 'checkout.completed'});
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Profile stub')).toBeInTheDocument();
  });

  test('offers to reopen when the buyer closes the checkout', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    const onEvent = callbackAt(0);
    await act(async () => {
      onEvent?.({name: 'checkout.closed'});
    });
    expect(screen.getByText(/was closed before/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Reopen checkout'}),
    ).toBeInTheDocument();
  });

  test('shows an error when Paddle.js fails to load', async () => {
    mockConfigured.mockReturnValue(true);
    mockInitialize.mockRejectedValue(new Error('network'));
    await renderPay('/pay?_ptxn=txn_123');
    expect(await screen.findByText(/couldn’t be opened/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Try again'})).toBeInTheDocument();
  });

  test('shows an error when the checkout reports an error event', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    const onEvent = callbackAt(0);
    await act(async () => {
      onEvent?.({name: 'checkout.error'});
    });
    expect(screen.getByText(/couldn’t be opened/i)).toBeInTheDocument();
  });

  test('ignores unrelated Paddle events', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    const onEvent = callbackAt(0);
    await act(async () => {
      onEvent?.({name: 'checkout.loaded'});
    });
    expect(
      screen.getByText(/Opening the secure payment window/i),
    ).toBeInTheDocument();
  });

  // jsdom's location.reload is unforgeable (it cannot be spied or stubbed),
  // so these two tests assert the click lands and the page stays put; in a
  // real browser the handler reloads the page, re-running initialization.
  test('try again reloads the page after a load failure', async () => {
    mockConfigured.mockReturnValue(true);
    mockInitialize.mockRejectedValue(new Error('network'));
    await renderPay('/pay?_ptxn=txn_123');
    await userEvent.click(
      await screen.findByRole('button', {name: 'Try again'}),
    );
    expect(screen.getByText(/couldn’t be opened/i)).toBeInTheDocument();
  });

  test('reopen checkout reloads the page after the buyer closes it', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    const onEvent = callbackAt(0);
    await act(async () => {
      onEvent?.({name: 'checkout.closed'});
    });
    await userEvent.click(
      screen.getByRole('button', {name: 'Reopen checkout'}),
    );
    expect(screen.getByText(/was closed before/i)).toBeInTheDocument();
  });

  test('home button navigates away from the explainer state', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay');
    await userEvent.click(
      screen.getByRole('button', {name: 'Go to Eciperay home'}),
    );
    expect(screen.queryByText(/completes a purchase/i)).not.toBeInTheDocument();
  });

  test('ignores events that arrive after unmount', async () => {
    mockConfigured.mockReturnValue(true);
    const {unmount} = await renderPay('/pay?_ptxn=txn_123');
    const onEvent = callbackAt(0);
    unmount();
    expect(mockRelease).toHaveBeenCalledWith(onEvent);
    await act(async () => {
      onEvent?.({name: 'checkout.completed'});
    });
    expect(screen.queryByText('Profile stub')).not.toBeInTheDocument();
  });

  test('ignores a load failure that arrives after unmount', async () => {
    mockConfigured.mockReturnValue(true);
    let rejectLoad: (reason: unknown) => void = () => {};
    mockInitialize.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectLoad = reject;
        }),
    );
    const {unmount} = await renderPay('/pay?_ptxn=txn_123');
    unmount();
    await act(async () => {
      rejectLoad(new Error('late failure'));
    });
    expect(screen.queryByText(/couldn’t be opened/i)).not.toBeInTheDocument();
  });

  // StrictMode effect replay (setup, cleanup, setup on one mounted
  // instance) cannot be reproduced literally here — this repo's vitest
  // runs React's production build, which never double-invokes effects.
  // This test drives the same sequence through dependency churn: every
  // cleanup must release its handler and every setup must register a new
  // one, leaving exactly the latest handler live.
  test('effect churn leaves exactly the latest handler live', async () => {
    mockConfigured.mockReturnValue(true);
    const TxnSwitcher = () => {
      const navigate = useNavigate();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              void navigate('/pay?_ptxn=txn_2');
            }}
          >
            Switch to txn 2
          </button>
          <button
            type="button"
            onClick={() => {
              void navigate('/pay?_ptxn=txn_1');
            }}
          >
            Switch to txn 1
          </button>
        </>
      );
    };
    await renderWithProviders(
      <Routes>
        <Route
          path="/pay"
          element={
            <>
              <PayPage />
              <TxnSwitcher />
            </>
          }
        />
        <Route
          path="/profile"
          element={<div>Profile stub</div>}
        />
      </Routes>,
      {route: '/pay?_ptxn=txn_1', withAuth: false},
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Switch to txn 2'}),
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Switch to txn 1'}),
    );
    expect(mockInitialize).toHaveBeenCalledTimes(3);
    expect(mockRelease).toHaveBeenCalledWith(callbackAt(0));
    expect(mockRelease).toHaveBeenCalledWith(callbackAt(1));
    await act(async () => {
      callbackAt(0)?.({name: 'checkout.completed'});
      callbackAt(1)?.({name: 'checkout.completed'});
    });
    expect(screen.queryByText('Profile stub')).not.toBeInTheDocument();
    await act(async () => {
      callbackAt(2)?.({name: 'checkout.completed'});
    });
    expect(await screen.findByText('Profile stub')).toBeInTheDocument();
  });

  test('re-registers its handler when the transaction id changes', async () => {
    mockConfigured.mockReturnValue(true);
    const TxnSwitcher = () => {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          onClick={() => {
            void navigate('/pay?_ptxn=txn_2');
          }}
        >
          Switch transaction
        </button>
      );
    };
    await renderWithProviders(
      <Routes>
        <Route
          path="/pay"
          element={
            <>
              <PayPage />
              <TxnSwitcher />
            </>
          }
        />
        <Route
          path="/profile"
          element={<div>Profile stub</div>}
        />
      </Routes>,
      {route: '/pay?_ptxn=txn_1', withAuth: false},
    );
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole('button', {name: 'Switch transaction'}),
    );
    expect(mockInitialize).toHaveBeenCalledTimes(2);
    expect(mockInitialize).toHaveBeenLastCalledWith(
      'txn_2',
      expect.any(Function),
    );
    await act(async () => {
      callbackAt(0)?.({name: 'checkout.completed'});
    });
    expect(screen.queryByText('Profile stub')).not.toBeInTheDocument();
    await act(async () => {
      callbackAt(1)?.({name: 'checkout.completed'});
    });
    expect(await screen.findByText('Profile stub')).toBeInTheDocument();
  });
});
