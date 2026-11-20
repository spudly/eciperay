import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileFamilySharingSection} from './ProfileFamilySharingSection.js';

const grant = {
  ownerUserId: 'user-uuid-1',
  recipientUserId: 'recipient-uuid-1',
  recipientEmail: 'sister@example.com',
  recipientDisplayName: 'Sister',
  createdAt: '2026-11-20T00:00:00.000Z',
};

describe('ProfileFamilySharingSection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('shows the empty state when nobody is designated', async () => {
    vi.spyOn(eciperay.account, 'listFamilySharing').mockResolvedValue([]);
    await renderWithProviders(<ProfileFamilySharingSection />);
    expect(
      await screen.findByText(
        'You have not designated anyone for family sharing yet.',
      ),
    ).toBeInTheDocument();
  });

  test('lists designations and removes one after confirmation', async () => {
    vi.spyOn(eciperay.account, 'listFamilySharing').mockResolvedValue([
      grant,
    ]);
    const deleteSpy = vi
      .spyOn(eciperay.account, 'deleteFamilySharing')
      .mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderWithProviders(<ProfileFamilySharingSection />);

    expect(
      await screen.findByText('Sister (sister@example.com)'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove family sharing for Sister (sister@example.com)',
      }),
    );

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('recipient-uuid-1');
    });
    expect(confirm).toHaveBeenCalled();
  });

  test('does not remove when the confirmation is declined', async () => {
    vi.spyOn(eciperay.account, 'listFamilySharing').mockResolvedValue([
      grant,
    ]);
    const deleteSpy = vi
      .spyOn(eciperay.account, 'deleteFamilySharing')
      .mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderWithProviders(<ProfileFamilySharingSection />);

    await screen.findByText('Sister (sister@example.com)');
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove family sharing for Sister (sister@example.com)',
      }),
    );
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  test('designates a new recipient by email', async () => {
    vi.spyOn(eciperay.account, 'listFamilySharing').mockResolvedValue([]);
    const createSpy = vi
      .spyOn(eciperay.account, 'createFamilySharing')
      .mockResolvedValue(grant);
    await renderWithProviders(<ProfileFamilySharingSection />);

    await screen.findByText(
      'You have not designated anyone for family sharing yet.',
    );
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'sister@example.com',
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Add family sharing'}),
    );

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith('sister@example.com');
    });
  });

  test('surfaces the server error for an unknown email', async () => {
    vi.spyOn(eciperay.account, 'listFamilySharing').mockResolvedValue([]);
    vi.spyOn(eciperay.account, 'createFamilySharing').mockRejectedValue(
      new Error('No account found for that email address'),
    );
    await renderWithProviders(<ProfileFamilySharingSection />);

    await screen.findByText(
      'You have not designated anyone for family sharing yet.',
    );
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'nobody@example.com',
    );
    await userEvent.click(
      screen.getByRole('button', {name: 'Add family sharing'}),
    );

    expect(
      await screen.findByText('No account found for that email address'),
    ).toBeInTheDocument();
  });
});
