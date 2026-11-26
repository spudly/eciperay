import {LANDING_HERO_TITLE} from '@eciperay/client';
import {act, screen} from '@testing-library/react';
import {afterEach, beforeEach, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {HomeEntry} from './HomeEntry.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('HomeEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows loading state while auth resolves', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: true});
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.queryByRole('status')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('shows marketing landing page when logged out', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.getByText(LANDING_HERO_TITLE)).toBeInTheDocument();
    // The signed-out landing renders inside the one AppShell (#620):
    // the DS AppShellPage chrome supplies the header — the brand
    // link home carries the DS-owned 'eciperay' mark (an svg, the
    // #620 regression) beside the wordmark, and Sign in is a real
    // link to the login route — plus the shared BigFooter (the
    // second Eciperay brand link, and the legal links, #425).
    const brandLinks = screen.getAllByRole('link', {name: 'Eciperay'});
    expect(brandLinks).toHaveLength(2);
    for (const brandLink of brandLinks) {
      expect(brandLink).toHaveAttribute('href', '/');
    }
    expect(brandLinks[0]?.querySelector('svg') ?? null).not.toBeNull();
    const signInLinks = screen.getAllByRole('link', {name: 'Sign in'});
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of signInLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }
    expect(screen.getByRole('link', {name: 'Privacy Policy'})).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(
      screen.getByRole('link', {
        name: 'Do Not Sell or Share My Personal Information',
      }),
    ).toHaveAttribute('href', '/privacy/consent');
  });

  test('shows authenticated home dashboard when logged in', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 'token'},
      isLoading: false,
    });
    await renderWithProviders(<HomeEntry />, {withAuth: false});
    expect(screen.getByText('Welcome to Eciperay')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
  });
});
