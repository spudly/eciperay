import {FeedbackPreferenceContextProvider} from '@eciperay/client';
import {fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';

import {ProfileFeedbackPreference} from './ProfileFeedbackPreference';

jest.mock('../lib/env', () => ({POSTHOG_KEY: 'phc_test'}));

describe('ProfileFeedbackPreference', () => {
  test('toggles the feedback shortcut preference', () => {
    const setEnabled = jest.fn();
    render(
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={setEnabled}
      >
        <ProfileFeedbackPreference />
      </FeedbackPreferenceContextProvider>,
    );

    fireEvent(
      screen.getByLabelText('Show feedback shortcut'),
      'valueChange',
      true,
    );
    expect(setEnabled).toHaveBeenCalledWith(true);
  });
});
