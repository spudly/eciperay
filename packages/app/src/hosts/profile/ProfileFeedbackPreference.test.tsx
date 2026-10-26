import {FeedbackPreferenceContextProvider} from '@eciperay/client';
import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ProfileFeedbackPreference} from './ProfileFeedbackPreference';

jest.mock('../../lib/env', () => ({POSTHOG_KEY: 'phc_test'}));

describe('ProfileFeedbackPreference', () => {
  test('toggles the feedback shortcut preference', async () => {
    const setEnabled = jest.fn();
    await renderWithProviders(
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={setEnabled}
      >
        <ProfileFeedbackPreference />
      </FeedbackPreferenceContextProvider>,
    );

    await fireEvent.press(screen.getByText('Show feedback shortcut'));
    expect(setEnabled).toHaveBeenCalledWith(true);
  });
});
