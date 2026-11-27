import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {Linking} from 'react-native';
import {
  FeedbackPreferenceContextProvider,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '@eciperay/client';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {eciperay} from '../lib/api';
import {tagsHref} from '../lib/deepLinks';
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

const mockGetNutritionGoals = eciperay.account.getNutritionGoals as jest.Mock;
const mockPutNutritionGoals = eciperay.account.putNutritionGoals as jest.Mock;
const mockGetAuthorDisplay = eciperay.account.getAuthorDisplay as jest.Mock;
const mockMe = eciperay.auth.me as jest.Mock;

const renderProfileScreen = async () =>
  await renderWithProviders(
    <FeedbackPreferenceContextProvider
      enabled={false}
      setEnabled={jest.fn()}
    >
      <ProfileScreen />
    </FeedbackPreferenceContextProvider>,
  );

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockGetNutritionGoals.mockResolvedValue({
      caloriesMin: null,
      caloriesMax: null,
      proteinGMin: null,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: null,
      fatGMin: null,
      fatGMax: null,
      satietyScoreMin: null,
      satietyScoreMax: null,
    });
    mockPutNutritionGoals.mockResolvedValue({
      caloriesMin: 2000,
      caloriesMax: null,
      proteinGMin: null,
      proteinGMax: null,
      carbsGMin: null,
      carbsGMax: null,
      fatGMin: null,
      fatGMax: null,
      satietyScoreMin: null,
      satietyScoreMax: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  test('shows the author-display load error from the en-XA catalog (#465)', async () => {
    mockGetAuthorDisplay.mockRejectedValue(new Error('offline'));
    const {findByText} = await renderWithProviders(
      <FeedbackPreferenceContextProvider
        enabled={false}
        setEnabled={jest.fn()}
      >
        <ProfileScreen />
      </FeedbackPreferenceContextProvider>,
      {locale: 'en-XA'},
    );
    expect(
      await findByText('Could not load your author display settings: offline~'),
    ).toBeTruthy();
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

  // Manage Tags is an href now (#248): a press opens the deep link
  // through Linking and the container's linking config routes it to
  // the Tags screen the old callback navigated to.
  test('opens the tags deep link for an admin', async () => {
    // Tag management is admin-only (#621): the link appears only
    // when /auth/me reports isAdmin.
    mockMe.mockResolvedValue({isAdmin: true});
    const {findByText} = await renderProfileScreen();
    await fireEvent.press(await findByText('Manage Tags'));
    expect(Linking.openURL).toHaveBeenCalledWith(tagsHref);
  });

  test('hides the tags link for a non-admin', async () => {
    mockMe.mockResolvedValue({isAdmin: false});
    const {queryByText, findByText} = await renderProfileScreen();
    // Wait for the profile to render, then the link must be absent.
    await findByText('Daily nutrition goals');
    expect(queryByText('Manage Tags')).toBeNull();
  });

  test('shows a profile load error with retry, then renders the tags link for an admin after retry', async () => {
    mockMe.mockRejectedValueOnce(new Error('boom'));
    mockMe.mockResolvedValue({isAdmin: true});
    const {findByText} = await renderProfileScreen();
    // A failed /auth/me is not a non-admin verdict (#650 review): an
    // explicit error with a retry action instead of silently hiding
    // Manage Tags as if non-admin were confirmed.
    expect(await findByText('Could not load your profile: boom')).toBeTruthy();
    await fireEvent.press(await findByText('Try again'));
    expect(await findByText('Manage Tags')).toBeTruthy();
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
