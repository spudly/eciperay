import {fireEvent, render, screen} from '@testing-library/react';

import {
  FeedbackPreferenceProvider,
  useFeedbackShortcutEnabled,
} from './FeedbackPreferenceContext.js';

const Probe = () => {
  const {enabled, setEnabled} = useFeedbackShortcutEnabled();
  return (
    <>
      <span>{enabled ? 'on' : 'off'}</span>
      <button
        type="button"
        onClick={() => { setEnabled(true); }}
      >
        Enable
      </button>
    </>
  );
};

describe('FeedbackPreferenceContext', () => {
  test('provides feedback shortcut preference state', () => {
    render(
      <FeedbackPreferenceProvider initialEnabled={false}>
        <Probe />
      </FeedbackPreferenceProvider>,
    );

    expect(screen.getByText('off')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Enable'}));
    expect(screen.getByText('on')).toBeTruthy();
  });

  test('throws when used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(
      'useFeedbackShortcutEnabled must be used within FeedbackPreferenceProvider',
    );
  });
});
