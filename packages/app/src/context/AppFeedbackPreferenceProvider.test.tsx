import {useFeedbackShortcutEnabled} from '@eciperay/client';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {Text, TouchableOpacity} from 'react-native';
import React from 'react';

import * as feedbackPreference from '../lib/feedbackPreference.js';

import {AppFeedbackPreferenceProvider} from './AppFeedbackPreferenceProvider';

const Probe = ({
  onReady,
}: {
  onReady?: (value: ReturnType<typeof useFeedbackShortcutEnabled>) => void;
}) => {
  const context = useFeedbackShortcutEnabled();
  onReady?.(context);
  return <Text>{context.enabled ? 'enabled' : 'disabled'}</Text>;
};

describe('AppFeedbackPreferenceProvider', () => {
  beforeEach(() => {
    jest
      .spyOn(feedbackPreference, 'readFeedbackShortcutEnabled')
      .mockResolvedValue(true);
    jest
      .spyOn(feedbackPreference, 'writeFeedbackShortcutEnabled')
      .mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads the stored feedback shortcut preference', async () => {
    await render(
      <AppFeedbackPreferenceProvider>
        <Probe />
      </AppFeedbackPreferenceProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('enabled')).toBeTruthy();
    });
  });

  test('persists preference changes', async () => {
    let setEnabled: ((enabled: boolean) => void) | undefined;
    await render(
      <AppFeedbackPreferenceProvider>
        <Probe
          onReady={value => {
            setEnabled = value.setEnabled;
          }}
        />
        <TouchableOpacity
          accessibilityLabel="Disable feedback shortcut"
          onPress={() => {
            setEnabled?.(false);
          }}
        />
      </AppFeedbackPreferenceProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('enabled')).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('Disable feedback shortcut'));

    await waitFor(() => {
      expect(
        feedbackPreference.writeFeedbackShortcutEnabled,
      ).toHaveBeenCalledWith(false);
    });
  });
});
