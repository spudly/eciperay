import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {supabase} from '../../lib/supabase.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ForgotPasswordPage} from './ForgotPasswordPage.js';

describe('ForgotPasswordPage', () => {
  test('sends reset email', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.click(screen.getByText('Send reset link'));
    await waitFor(() => {
      expect(screen.getByText('Email sent')).toBeInTheDocument();
    });
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalled();
  });

  test('shows error on failure', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      error: Object.assign(new Error('Reset failed'), {
        name: 'AuthError',
        status: 400,
      }) as never,
      data: {},
    });
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.click(screen.getByText('Send reset link'));
    await waitFor(() => {
      expect(screen.getByText('Reset failed')).toBeInTheDocument();
    });
  });
});
