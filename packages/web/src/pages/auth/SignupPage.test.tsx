import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {supabase} from '../../lib/supabase.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {SignupPage} from './SignupPage.js';

const mockUseAuth = vi.fn();

vi.mock('@recipoo/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@recipoo/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('SignupPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        session: {
          access_token: 't',
          user: {id: '1', email: 'a@b.com'},
        } as never,
        user: {id: '1', email: 'a@b.com'} as never,
      },
      error: null,
    });
  });

  test('redirects when session exists', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 't'},
      isLoading: false,
    });
    await renderWithProviders(<SignupPage />, {withAuth: false});
    expect(screen.queryByText('Create account')).not.toBeInTheDocument();
  });

  test('signs up with session', async () => {
    await renderWithProviders(<SignupPage />, {withAuth: false});
    await userEvent.type(screen.getByPlaceholderText('Display name'), 'Test');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass1234');
    await userEvent.click(screen.getByText('Sign Up'));
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalled();
    });
  });

  test('shows confirmation when no session', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: {session: null, user: {id: '1', email: 'a@b.com'} as never},
      error: null,
    });
    await renderWithProviders(<SignupPage />, {withAuth: false});
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass1234');
    await userEvent.click(screen.getByText('Sign Up'));
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  test('shows error on failure', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: {session: null, user: null},
      error: Object.assign(new Error('Signup failed'), {
        name: 'AuthError',
        status: 400,
      }) as never,
    });
    await renderWithProviders(<SignupPage />, {withAuth: false});
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass');
    await userEvent.click(screen.getByText('Sign Up'));
    await waitFor(() => {
      expect(screen.getByText('Signup failed')).toBeInTheDocument();
    });
  });
});
