import {act, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {supabase} from '../../lib/supabase.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ResetPasswordPage} from './ResetPasswordPage.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('ResetPasswordPage', () => {
  test('redirects when no session', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(<ResetPasswordPage />, {withAuth: false});
    expect(screen.queryByText('New password')).not.toBeInTheDocument();
  });

  test('updates password and schedules redirect', async () => {
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    mockUseAuth.mockReturnValue({
      session: {access_token: 't'},
      isLoading: false,
    });
    await renderWithProviders(<ResetPasswordPage />, {withAuth: false});
    await userEvent.type(
      screen.getByPlaceholderText('New password'),
      'newpass',
    );
    await userEvent.click(screen.getByText('Update password'));
    await waitFor(() => {
      expect(screen.getByText('Password updated')).toBeInTheDocument();
    });
    const redirectCall = timeoutSpy.mock.calls.find(call => call[1] === 2000);
    const callback = redirectCall?.[0];
    if (typeof callback === 'function') {
      act(() => {
        callback();
      });
    }
    timeoutSpy.mockRestore();
  });

  test('shows error on failure', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 't'},
      isLoading: false,
    });
    vi.mocked(supabase.auth.updateUser).mockResolvedValueOnce({
      error: Object.assign(new Error('Update failed'), {
        name: 'AuthError',
        status: 400,
      }) as never,
      data: {user: null},
    });
    await renderWithProviders(<ResetPasswordPage />, {withAuth: false});
    await userEvent.type(
      screen.getByPlaceholderText('New password'),
      'newpass',
    );
    await userEvent.click(screen.getByText('Update password'));
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });
});
