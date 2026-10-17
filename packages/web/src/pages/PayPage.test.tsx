import {act, screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {initializePaddle, isPaddleConfigured} from '../lib/paddle.js';
import {renderWithProviders} from '../test/testUtils.js';

import {PayPage} from './PayPage.js';

vi.mock('../lib/paddle.js', () => ({
  isPaddleConfigured: vi.fn(),
  initializePaddle: vi.fn(),
}));

const mockConfigured = vi.mocked(isPaddleConfigured);
const mockInitialize = vi.mocked(initializePaddle);

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
    const onEvent = mockInitialize.mock.calls[0]?.[0];
    expect(typeof onEvent).toBe('function');
    await act(async () => {
      onEvent?.({name: 'checkout.completed'});
    });
    expect(await screen.findByText('Profile stub')).toBeInTheDocument();
  });

  test('offers to reopen when the buyer closes the checkout', async () => {
    mockConfigured.mockReturnValue(true);
    await renderPay('/pay?_ptxn=txn_123');
    const onEvent = mockInitialize.mock.calls[0]?.[0];
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
});
