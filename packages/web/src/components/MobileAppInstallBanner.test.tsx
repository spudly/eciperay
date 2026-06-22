import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';
import {
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
} from '@eciperay/client';

import {renderWithProviders} from '../test/testUtils.js';

import {MobileAppInstallBanner} from './MobileAppInstallBanner.js';

const mockShouldShow = vi.fn();
const mockWriteDismissal = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    shouldShowMobileAppInstallPrompt: () => mockShouldShow(),
    writeMobileAppInstallDismissal: () => mockWriteDismissal(),
  };
});

describe('MobileAppInstallBanner', () => {
  beforeEach(() => {
    mockShouldShow.mockReset();
    mockWriteDismissal.mockReset();
  });

  test('shows store links on mobile web browsers', async () => {
    mockShouldShow.mockReturnValue(true);
    await renderWithProviders(<MobileAppInstallBanner />, {withAuth: false});

    expect(
      screen.getByText(MOBILE_WEB_INSTALL_BANNER_MESSAGE),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'App Store'})).toHaveAttribute(
      'href',
      IOS_APP_STORE_URL,
    );
    expect(screen.getByRole('link', {name: 'Google Play'})).toHaveAttribute(
      'href',
      ANDROID_PLAY_STORE_URL,
    );
  });

  test('dismisses the banner and stores the preference locally', async () => {
    mockShouldShow.mockReturnValue(true);
    await renderWithProviders(<MobileAppInstallBanner />, {withAuth: false});

    await userEvent.click(
      screen.getByRole('button', {name: /dismiss mobile app install prompt/i}),
    );

    expect(mockWriteDismissal).toHaveBeenCalled();
    expect(
      screen.queryByRole('region', {name: /mobile app install prompt/i}),
    ).not.toBeInTheDocument();
  });

  test('stays hidden when the prompt should not show', async () => {
    mockShouldShow.mockReturnValue(false);
    await renderWithProviders(<MobileAppInstallBanner />, {withAuth: false});

    expect(
      screen.queryByRole('region', {name: /mobile app install prompt/i}),
    ).not.toBeInTheDocument();
  });
});
