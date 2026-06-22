import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {downloadAccountExportBundle} from '../lib/downloadAccountExport.js';
import {eciperay} from '../lib/api.js';
import {renderWithProviders} from '../test/testUtils.js';
import {supabase} from '../lib/supabase.js';

import {ProfileAccountDataSection} from './ProfileAccountDataSection.js';

vi.mock('../lib/downloadAccountExport.js', () => ({
  downloadAccountExportBundle: vi.fn(),
}));

describe('ProfileAccountDataSection', () => {
  test('downloads account data export', async () => {
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
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
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  test('shows export errors', async () => {
    vi.spyOn(eciperay.account, 'exportData').mockRejectedValueOnce(
      new Error('Export failed'),
    );
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Download my data/i}),
    );
    expect(await screen.findByText('Export failed')).toBeInTheDocument();
  });

  test('shows a generic export error for unexpected failures', async () => {
    vi.spyOn(eciperay.account, 'exportData').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
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
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
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
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  test('shows a generic account deletion error for unexpected failures', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(eciperay.account, 'deleteAccount').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfileAccountDataSection />, {withAuth: false});
    await userEvent.click(
      screen.getByRole('button', {name: /Delete account/i}),
    );
    expect(
      await screen.findByText('Account deletion failed'),
    ).toBeInTheDocument();
  });
});
