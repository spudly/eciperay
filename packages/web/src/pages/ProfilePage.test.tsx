import {queryKeys} from '@eciperay/client';
import type {Entitlement} from '@eciperay/types';
import {focusManager, QueryClient} from '@tanstack/react-query';
import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {downloadAccountExportBundle} from '../lib/downloadAccountExport.js';
import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';
import {eciperay} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';
import {supabase} from '../lib/supabase.js';

import {ProfilePage} from './ProfilePage.js';

const mockUseAuth = vi.fn();

// #460 tranche 1: the former ProfilePage.subscription.test.tsx and
// ProfilePage.accountSwitch.test.tsx are merged below. All three
// files share the single @eciperay/client mock above; each describe
// installs the useAuth behavior it needs on mockUseAuth in
// beforeEach — the canonical describe returns the email session,
// the subscription describe returns the provider-less default
// (no session), and the account-switch describe returns a session
// whose user id follows authState, so the account can switch
// mid-test while the component stays mounted.
const authState = vi.hoisted(() => ({userId: 'user-a'}));
const mockNavigate = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

vi.mock('../lib/downloadRecipeExport.js', () => ({
  downloadRecipeExportBundle: vi.fn(),
}));

vi.mock('../lib/downloadAccountExport.js', () => ({
  downloadAccountExportBundle: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: {user: {email: 'test@example.com'}}});
    mockNavigate.mockReset();
  });

  test('shows email and signs out', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('exports selected recipes', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('checkbox', {name: /Test Recipe/i}));
    await userEvent.click(
      screen.getByRole('button', {name: /Export selected/i}),
    );

    await waitFor(() => {
      expect(downloadRecipeExportBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          formatVersion: 1,
          recipes: expect.arrayContaining([
            expect.objectContaining({title: 'Test Recipe'}),
          ]),
        }),
      );
    });
  });

  test('opens the file picker when import is clicked', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    const fileInput = document.querySelector('input[type="file"]')!;
    const click = vi.fn();
    Object.defineProperty(fileInput, 'click', {value: click});

    await userEvent.click(screen.getByRole('button', {name: 'Import recipes'}));

    expect(click).toHaveBeenCalled();
  });

  test('shows an error for invalid import files', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File(['{"recipes":[]}'], 'recipes.json', {type: 'application/json'}),
      {text: async () => '{"recipes":[]}'},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/non-empty recipes array/i)).toBeInTheDocument();
    });
  });

  test('shows a generic import error for unexpected failures', async () => {
    vi.spyOn(eciperay.import, 'importBulk').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const importJson = JSON.stringify({
      recipes: [
        {
          title: 'Imported Soup',
          description: null,
          servings: 4,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [
            {
              sortOrder: 0,
              name: 'Broth',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
          instructions: [{stepNumber: 1, body: 'Simmer'}],
        },
      ],
    });
    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });

  test('imports recipes from a JSON file', async () => {
    const importJson = JSON.stringify({
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      recipes: [
        {
          title: 'Imported Soup',
          description: null,
          servings: 4,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [
            {
              sortOrder: 0,
              name: 'Broth',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
          instructions: [{stepNumber: 1, body: 'Simmer'}],
        },
      ],
    });
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/Imported 1 recipe/i)).toBeInTheDocument();
    });
  });

  test('shows import errors returned by the API', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/import/bulk', () =>
        HttpResponse.json({
          created: [],
          errors: [
            {index: 0, title: 'Bad Recipe', message: 'Validation failed'},
          ],
        }),
      ),
    );

    const importJson = JSON.stringify({
      recipes: [
        {
          title: 'Bad Recipe',
          description: null,
          servings: 1,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [],
          instructions: [],
        },
      ],
    });
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
    });
  });

  test('downloads account data export', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Download my data/i}),
    );
    await waitFor(() => {
      expect(downloadAccountExportBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          formatVersion: 1,
          profile: expect.objectContaining({email: 'test@example.com'}),
        }),
      );
    });
  });

  test('deletes the account after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  test('shows account export errors', async () => {
    vi.spyOn(eciperay.account, 'exportData').mockRejectedValueOnce(
      new Error('Export failed'),
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Download my data/i}),
    );
    expect(await screen.findByText('Export failed')).toBeInTheDocument();
  });

  test('shows a generic account export error for unexpected failures', async () => {
    vi.spyOn(eciperay.account, 'exportData').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Download my data/i}),
    );
    expect(
      await screen.findByText('Account export failed'),
    ).toBeInTheDocument();
  });

  test('skips account deletion when confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteAccount = vi.spyOn(eciperay.account, 'deleteAccount');
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  test('shows account deletion errors', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(eciperay.account, 'deleteAccount').mockRejectedValueOnce(
      new Error('Delete failed'),
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  test('shows a generic account deletion error for unexpected failures', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(eciperay.account, 'deleteAccount').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    expect(
      await screen.findByText('Account deletion failed'),
    ).toBeInTheDocument();
  });

  test('finishes import cleanup when unmounted while an import is in flight', async () => {
    let finishImport: (() => void) | undefined;
    const importBulk = vi
      .spyOn(eciperay.import, 'importBulk')
      .mockImplementation(
        () =>
          new Promise(resolve => {
            finishImport = () => {
              resolve({created: [], errors: []});
            };
          }),
      );
    const view = await renderWithProviders(<ProfilePage />, {withAuth: false});

    const importJson = JSON.stringify({recipes: [{title: 'Imported Soup'}]});
    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(importBulk).toHaveBeenCalled();
    });
    // Unmounting detaches the file input, so the finally block must
    // tolerate fileInputRef.current being null when the import settles.
    view.unmount();
    await act(async () => {
      finishImport?.();
    });
  });
});

// Former ProfilePage.subscription.test.tsx.
describe('ProfilePage subscription section', () => {
  const plusEntitlement: Entitlement = {
    plan: 'plus',
    status: 'active',
    aiUsed: 3,
    aiLimit: 200,
    periodEndsAt: '2026-11-16T12:00:00.000Z',
    paddleCustomerId: 'ctm_123',
    cancelAtPeriodEnd: false,
  };
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: null, isLoading: true});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('loads and displays the entitlement', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(
      screen.getByText('Active — renews Nov 16, 2026'),
    ).toBeInTheDocument();
  });

  test('refetches the entitlement on window focus even while the cached entry is fresh', async () => {
    const getEntitlement = vi
      .spyOn(eciperay.account, 'getEntitlement')
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(
      await screen.findByText('Active — renews Nov 16, 2026'),
    ).toBeInTheDocument();
    // The user changes the subscription in the portal and returns
    // while the cached entitlement is still fresh (the test client
    // uses staleTime: Infinity): focus must refetch anyway, or the
    // profile keeps showing the pre-portal plan/status.
    getEntitlement.mockResolvedValue({
      ...plusEntitlement,
      cancelAtPeriodEnd: true,
    });
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(
      await screen.findByText('Cancelling — access until Nov 16, 2026'),
    ).toBeInTheDocument();
    expect(getEntitlement).toHaveBeenCalledTimes(2);
  });

  test('reconciles a delayed webhook update without another focus event', async () => {
    const freeEntitlement: Entitlement = {
      plan: 'free',
      status: null,
      aiUsed: 0,
      aiLimit: 25,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    };
    // The first fetch beats the checkout webhook and returns the old
    // (free) entitlement; the webhook then lands, but no further focus
    // event occurs while the profile stays open. The bounded
    // reconciliation cycle must refetch on its own and pick the new
    // plan up.
    const getEntitlement = vi
      .spyOn(eciperay.account, 'getEntitlement')
      .mockResolvedValueOnce(freeEntitlement)
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(await screen.findByText('Free plan')).toBeInTheDocument();
    expect(
      await screen.findByText('Plus plan', undefined, {timeout: 6000}),
    ).toBeInTheDocument();
    expect(getEntitlement.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('manage subscription pre-opens a tab and navigates it to the portal link', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let resolvePortal!: (value: {url: string}) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>(resolve => {
          resolvePortal = resolve;
        }),
    );
    const portalTab = {
      closed: false,
      opener: {} as unknown,
      location: {href: ''},
      close: vi.fn(),
    };
    const open = vi
      .spyOn(window, 'open')
      .mockImplementation(() => portalTab as unknown as Window);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    // The tab opens synchronously on click, before the request resolves,
    // so the browser's popup blocker cannot eat it.
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(portalTab.location.href).toBe('');
    resolvePortal({url: 'https://portal.example/session'});
    await screen.findByRole('button', {name: 'Manage subscription'});
    expect(portalTab.location.href).toBe('https://portal.example/session');
    expect(portalTab.opener).toBeNull();
    expect(portalTab.close).not.toHaveBeenCalled();
  });

  test('shows a clickable portal link when the pre-opened tab is blocked', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockResolvedValue({
      url: 'https://portal.example/session',
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    const link = await screen.findByRole('link', {
      name: 'Open subscription portal',
    });
    expect(link).toHaveAttribute('href', 'https://portal.example/session');
  });

  test('check again reconciles with the server and shows the new plan', async () => {
    const freeEntitlement: Entitlement = {
      plan: 'free',
      status: null,
      aiUsed: 0,
      aiLimit: 25,
      periodEndsAt: null,
      paddleCustomerId: null,
      cancelAtPeriodEnd: false,
    };
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      freeEntitlement,
    );
    const refresh = vi
      .spyOn(eciperay.account, 'refreshEntitlement')
      .mockResolvedValue(plusEntitlement);
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(await screen.findByText('Free plan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Check again'}));
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  test('check again cancels in-flight entitlement fetches before caching', async () => {
    const cancelQueries = vi.spyOn(QueryClient.prototype, 'cancelQueries');
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.account, 'refreshEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Check again'}),
    );
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    // A slower in-flight GET must not be able to land afterwards and
    // overwrite the refreshed entitlement with its older snapshot.
    expect(cancelQueries).toHaveBeenCalledWith({
      queryKey: ['entitlement', 'anonymous'],
    });
  });

  test('check again surfaces a refresh failure', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.account, 'refreshEntitlement').mockRejectedValue(
      new Error('billing not configured'),
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Check again'}),
    );
    expect(
      await screen.findByText('billing not configured'),
    ).toBeInTheDocument();
  });

  test('does not show the checking hint while idle', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(await screen.findByText('Plus plan')).toBeInTheDocument();
    expect(
      screen.queryByText('Checking for the latest subscription status…'),
    ).not.toBeInTheDocument();
  });

  test('shows an error when the entitlement fails to load', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockRejectedValue(
      new Error('boom'),
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  test('shows an error and closes the pre-opened tab when the portal link fails', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    vi.spyOn(eciperay.billing, 'createPortalLink').mockRejectedValue(
      new Error('portal down'),
    );
    const portalTab = {
      closed: false,
      opener: null,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    expect(await screen.findByText('portal down')).toBeInTheDocument();
    expect(portalTab.close).toHaveBeenCalledTimes(1);
  });

  test('navigates the pre-opened tab even when unmounted while the portal request is pending', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let resolvePortal!: (value: {url: string}) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>(resolve => {
          resolvePortal = resolve;
        }),
    );
    const portalTab = {
      closed: false,
      opener: {} as unknown,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    const view = await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    // Leaving /profile mid-request must not strand the blank tab:
    // per-call mutate callbacks are skipped after unmount, so the tab
    // is driven from the mutateAsync promise instead.
    view.unmount();
    await act(async () => {
      resolvePortal({url: 'https://portal.example/session'});
    });
    expect(portalTab.location.href).toBe('https://portal.example/session');
    expect(portalTab.opener).toBeNull();
    expect(portalTab.close).not.toHaveBeenCalled();
  });

  test('closes the pre-opened tab even when unmounted while the portal request is pending and then fails', async () => {
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      plusEntitlement,
    );
    let rejectPortal!: (reason: unknown) => void;
    vi.spyOn(eciperay.billing, 'createPortalLink').mockImplementation(
      () =>
        new Promise<{url: string}>((_, reject) => {
          rejectPortal = reject;
        }),
    );
    const portalTab = {
      closed: false,
      opener: null,
      location: {href: ''},
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockImplementation(
      () => portalTab as unknown as Window,
    );
    const view = await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(
      await screen.findByRole('button', {name: 'Manage subscription'}),
    );
    view.unmount();
    await act(async () => {
      rejectPortal(new Error('portal down'));
    });
    expect(portalTab.close).toHaveBeenCalledTimes(1);
    expect(portalTab.location.href).toBe('');
  });
});

// Former ProfilePage.accountSwitch.test.tsx.
describe('ProfilePage subscription account switch during refresh', () => {
  const freeEntitlement: Entitlement = {
    plan: 'free',
    status: null,
    aiUsed: 0,
    aiLimit: 25,
    periodEndsAt: null,
    paddleCustomerId: null,
    cancelAtPeriodEnd: false,
  };

  const plusEntitlement: Entitlement = {
    plan: 'plus',
    status: 'active',
    aiUsed: 3,
    aiLimit: 200,
    periodEndsAt: '2026-11-16T12:00:00.000Z',
    paddleCustomerId: 'ctm_a',
    cancelAtPeriodEnd: false,
  };
  beforeEach(() => {
    mockUseAuth.mockImplementation(() => ({
      session: {user: {id: authState.userId}},
      isLoading: false,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a refresh response is cached under the account that started it', async () => {
    authState.userId = 'user-a';
    vi.spyOn(eciperay.account, 'getEntitlement').mockResolvedValue(
      freeEntitlement,
    );
    let resolveRefresh!: (value: Entitlement) => void;
    vi.spyOn(eciperay.account, 'refreshEntitlement').mockImplementation(
      () =>
        new Promise<Entitlement>(resolve => {
          resolveRefresh = resolve;
        }),
    );
    // Production-like cache retention: the shared QueryClient keeps
    // an unobserved entry for minutes (React Query's default gcTime),
    // which is exactly why a misdirected cache write would survive
    // the account switch. The shared test client uses gcTime: 0,
    // which would collect user-a's entry before the assertion.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 60_000,
          staleTime: Infinity,
          refetchOnWindowFocus: false,
        },
      },
    });
    const view = await renderWithProviders(<ProfilePage />, {
      withAuth: false,
      queryClient,
    });
    expect(await screen.findByText('Free plan')).toBeInTheDocument();

    // user-a starts a "Check again" refresh; the POST stays pending.
    await userEvent.click(screen.getByRole('button', {name: 'Check again'}));

    // The session switches to user-b while the POST is in flight and
    // the component stays mounted; user-b's own entitlement loads.
    authState.userId = 'user-b';
    view.rerender(<ProfilePage />);
    expect(await screen.findByText('Free plan')).toBeInTheDocument();

    // The pending refresh now resolves with user-a's Plus
    // entitlement. It must land in user-a's cache entry only: cached
    // under user-b, it would display user-a's plan and Paddle
    // customer id on user-b's profile.
    await act(async () => {
      resolveRefresh(plusEntitlement);
    });
    expect(queryClient.getQueryData(queryKeys.entitlement('user-a'))).toEqual(
      plusEntitlement,
    );
    expect(queryClient.getQueryData(queryKeys.entitlement('user-b'))).toEqual(
      freeEntitlement,
    );
    expect(screen.queryByText('Plus plan')).not.toBeInTheDocument();
  });
});
