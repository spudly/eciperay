import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {
  FeedbackPreferenceContextProvider,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '@eciperay/client';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {ProfileStackParamList} from '../navigation/types';

import {ProfileScreen} from './ProfileScreen';

const defaultUseAuth = (): {session: {user: {email: string}} | null} => ({
  session: {user: {email: 'user@test.com'}},
});

const mockUseAuth = jest.fn(defaultUseAuth);

jest.mock('@eciperay/client', () => ({
  ...jest.requireActual('@eciperay/client'),
  useAuth: () => mockUseAuth(),
}));

jest.mock('../lib/supabase', () => ({supabase: {auth: {signOut: jest.fn()}}}));
jest.mock('../lib/api');

const mockGetNutritionGoals = api.account.getNutritionGoals as jest.Mock;
const mockPutNutritionGoals = api.account.putNutritionGoals as jest.Mock;

const mockNavigate = jest.fn();
const stackProps = makeStackProps<ProfileStackParamList, 'ProfileHome'>(
  'ProfileHome',
  undefined,
  {navigate: mockNavigate},
);

const renderProfileScreen = async () =>
  await renderWithProviders(
    <FeedbackPreferenceContextProvider
      enabled={false}
      setEnabled={jest.fn()}
    >
      <ProfileScreen {...stackProps} />
    </FeedbackPreferenceContextProvider>,
  );

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockGetNutritionGoals.mockResolvedValue({
      calories: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    });
    mockPutNutritionGoals.mockResolvedValue({
      calories: 2000,
      proteinG: null,
      carbsG: null,
      fatG: null,
      satietyScore: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  test('renders without email when session is missing', async () => {
    // mockReturnValueOnce is not reliable here: the async renderer may
    // render more than once before committing, consuming the one-off value.
    mockUseAuth.mockReturnValue({session: null});
    try {
      const {queryByText} = await renderProfileScreen();
      await waitFor(() => {
        expect(queryByText('user@test.com')).toBeNull();
      });
    } finally {
      mockUseAuth.mockImplementation(defaultUseAuth);
    }
  });

  test('renders email and sign out button', async () => {
    const {findByText} = await renderProfileScreen();
    expect(await findByText('user@test.com')).toBeTruthy();
    expect(await findByText('Sign Out')).toBeTruthy();
  });

  test('signs out on button press', async () => {
    const {supabase} = require('../lib/supabase');
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('renders the feedback shortcut preference toggle', async () => {
    const {findByText} = await renderProfileScreen();
    expect(await findByText('Show feedback shortcut')).toBeTruthy();
  });

  test('navigates to Tags', async () => {
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Manage Tags'));
    expect(mockNavigate).toHaveBeenCalledWith('Tags');
  });

  test('opens the component showcase in dev', async () => {
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Component Showcase'));
    expect(mockNavigate).toHaveBeenCalledWith('ComponentShowcase');
  });

  test('opens legal document URLs', async () => {
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    await fireEvent.press(await findByText('Terms of Service'));
    expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
  });

  test('saves nutrition goals', async () => {
    const {findByText, getByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Save goals'));
    await waitFor(() => {
      expect(mockPutNutritionGoals).toHaveBeenCalled();
    });
    expect(getByText('Save goals')).toBeTruthy();
  });

  test('shows nutrition goal save errors', async () => {
    mockPutNutritionGoals.mockRejectedValueOnce(new Error('Goals failed'));
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Save goals'));
    expect(await findByText('Goals failed')).toBeTruthy();
  });
});
