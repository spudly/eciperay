import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {eciperay} from '../../lib/api.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {ProfileAuthorDisplaySection} from './ProfileAuthorDisplaySection.js';

describe('ProfileAuthorDisplaySection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('shows the published-recipes note and saves name and visibility', async () => {
    const user = userEvent.setup();
    vi.spyOn(eciperay.account, 'getAuthorDisplay').mockResolvedValue({
      displayName: 'Chef Alex',
      showOnPublicRecipes: true,
    });
    const putSpy = vi
      .spyOn(eciperay.account, 'putAuthorDisplay')
      .mockImplementation(async settings => settings);
    await renderWithProviders(<ProfileAuthorDisplaySection />);

    expect(
      await screen.findByText(
        'This name will be displayed on published recipes as their author.',
      ),
    ).toBeInTheDocument();
    const nameField = await screen.findByLabelText('Display name');
    expect(nameField).toHaveValue('Chef Alex');

    await user.clear(nameField);
    await user.type(nameField, 'Alex S.');
    await user.click(screen.getByRole('button', {name: 'Save author display'}));
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith({
        displayName: 'Alex S.',
        showOnPublicRecipes: true,
      });
    });
  });

  test('toggling the checkbox is included in the saved settings', async () => {
    const user = userEvent.setup();
    vi.spyOn(eciperay.account, 'getAuthorDisplay').mockResolvedValue({
      displayName: 'Chef Alex',
      showOnPublicRecipes: true,
    });
    const putSpy = vi
      .spyOn(eciperay.account, 'putAuthorDisplay')
      .mockImplementation(async settings => settings);
    await renderWithProviders(<ProfileAuthorDisplaySection />);

    const checkbox = await screen.findByRole('checkbox', {
      name: 'Show my name as the author on my published recipes',
    });
    await user.click(checkbox);
    await user.click(screen.getByRole('button', {name: 'Save author display'}));
    await waitFor(() => {
      expect(putSpy).toHaveBeenCalledWith({
        displayName: 'Chef Alex',
        showOnPublicRecipes: false,
      });
    });
  });
});
