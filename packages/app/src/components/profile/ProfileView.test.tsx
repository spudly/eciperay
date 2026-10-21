import {Text} from 'react-native';
import {FeedbackPreferenceContextProvider} from '@eciperay/client';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ProfileView} from './ProfileView';

/** Host types rendered for a tree, via the RNTL JSON snapshot. */
const renderedHostTypes = (json: unknown): string[] => {
  const types: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const {type, children} = node as {type?: string; children?: unknown[]};
    if (type) {
      types.push(type);
    }
    (children ?? []).forEach(walk);
  };
  walk(json);
  return types;
};

describe('ProfileView', () => {
  test('renders inside a scroll view so all sections stay reachable', async () => {
    const {toJSON, getByText} = await renderWithProviders(
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={jest.fn()}
      >
        <ProfileView
          email="chef@example.com"
          onSignOut={jest.fn()}
          sectionsBeforeFeedback={<Text>Extra section</Text>}
        />
      </FeedbackPreferenceContextProvider>,
    );

    // Regression (eciperay#166): Profile used the non-scrollable
    // ScreenContainer, so content below the fold was unreachable on Android.
    expect(renderedHostTypes(toJSON())).toContain('RCTScrollView');
    expect(getByText('Profile')).toBeTruthy();
    expect(getByText('Extra section')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });
});
