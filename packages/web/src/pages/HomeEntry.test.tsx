import {HOME_TITLE, LANDING_HERO_TITLE} from '@eciperay/client';
import {screen} from '@testing-library/react';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {HomeEntry} from './HomeEntry.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('HomeEntry', () => {
  test('shows loading state while auth resolves', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: true});
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  test('shows marketing landing page when logged out', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.getByText(LANDING_HERO_TITLE)).toBeInTheDocument();
  });

  test('shows authenticated home dashboard when logged in', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 'token'},
      isLoading: false,
    });
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.getByText(HOME_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
  });
});
