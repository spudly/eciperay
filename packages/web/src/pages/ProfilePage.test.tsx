import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';
import {supabase} from '../lib/supabase.js';

import {ProfilePage} from './ProfilePage.js';

const mockUseAuth = vi.fn();

vi.mock('@recipoo/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@recipoo/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('ProfilePage', () => {
  test('shows email and signs out', async () => {
    mockUseAuth.mockReturnValue({session: {user: {email: 'test@example.com'}}});
    renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
