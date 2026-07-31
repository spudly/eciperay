import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {
  FeedbackPreferenceContextProvider,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '@eciperay/client';

import {makeStackProps} from '../__tests__/testUtils';
import type {ProfileStackParamList} from '../navigation/types';

import {ProfileScreen} from './ProfileScreen';

const mockUseAuth = jest.fn((): {session: {user: {email: string}} | null} => ({
  session: {user: {email: 'user@test.com'}},
}));

jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: () => mockUseAuth(),
}));

jest.mock('../lib/supabase', () => ({supabase: {auth: {signOut: jest.fn()}}}));

const mockNavigate = jest.fn();
const stackProps = makeStackProps<ProfileStackParamList, 'ProfileHome'>(
  'ProfileHome',
  undefined,
  {navigate: mockNavigate},
);

const renderProfileScreen = () =>
  render(<ProfileScreen {...stackProps} />, {
    wrapper: ({children}) => (
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={jest.fn()}
      >
        {children}
      </FeedbackPreferenceContextProvider>
    ),
  });

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  test('renders without email when session is missing', () => {
    mockUseAuth.mockReturnValueOnce({session: null});
    const {queryByText} = renderProfileScreen();
    expect(queryByText('user@test.com')).toBeNull();
  });

  test('renders email and sign out button', () => {
    const {getByText} = renderProfileScreen();
    expect(getByText('user@test.com')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  test('signs out on button press', () => {
    const {supabase} = require('../lib/supabase');
    const {getByText} = renderProfileScreen();
    fireEvent.press(getByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('navigates to Tags', () => {
    const {getByText} = renderProfileScreen();
    fireEvent.press(getByText('Manage Tags'));
    expect(mockNavigate).toHaveBeenCalledWith('Tags');
  });

  test('opens the component showcase in dev', () => {
    const {getByText} = renderProfileScreen();
    fireEvent.press(getByText('Component Showcase'));
    expect(mockNavigate).toHaveBeenCalledWith('ComponentShowcase');
  });

  test('opens legal document URLs', () => {
    const {getByText} = renderProfileScreen();
    fireEvent.press(getByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    fireEvent.press(getByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
  });
});
