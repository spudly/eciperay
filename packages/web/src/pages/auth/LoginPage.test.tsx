import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {supabase} from '../../lib/supabase.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {LoginPage} from './LoginPage.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
  });

  test('redirects when session exists', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 't'},
      isLoading: false,
    });
    await renderWithProviders(<LoginPage />, {withAuth: false});
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });

  test('signs in successfully', async () => {
    await renderWithProviders(<LoginPage />, {withAuth: false});
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass');
    await userEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  test('shows error on failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      error: Object.assign(new Error('Invalid'), {
        name: 'AuthError',
        status: 400,
      }) as never,
      data: {user: null, session: null},
    });
    await renderWithProviders(<LoginPage />, {withAuth: false});
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'wrong');
    await userEvent.click(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
  });
});
