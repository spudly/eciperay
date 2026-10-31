import React from 'react';
import {Alert, Linking} from 'react-native';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {signInHref} from '../../lib/deepLinks';
import {api} from '../../lib/api';
import {supabase} from '../../lib/supabase';

import {SignUpScreen} from './SignUpScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {signUp: jest.fn()}},
}));
jest.mock('../../lib/api');

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSyncUser = api.auth.syncUser as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('SignUpScreen', () => {
  test('renders sign up form', async () => {
    const {getByLabelText} = await renderWithProviders(<SignUpScreen />);
    expect(getByLabelText('Your name')).toBeTruthy();
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
  });

  test('syncs user when session is returned', async () => {
    mockSignUp.mockResolvedValue({data: {session: {}}, error: null});
    mockSyncUser.mockImplementation(async () => {});
    const {getByText} = await renderWithProviders(<SignUpScreen />);
    await fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockSyncUser).toHaveBeenCalled();
    });
  });

  test('shows confirmation alert when email confirmation required', async () => {
    mockSignUp.mockResolvedValue({data: {session: null}, error: null});
    const {getByText} = await renderWithProviders(<SignUpScreen />);
    await fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Check your email',
        expect.any(String),
      );
    });
  });

  test('shows error alert on sign up failure', async () => {
    mockSignUp.mockResolvedValue({
      data: {session: null},
      error: new Error('Email taken'),
    });
    const {getByText} = await renderWithProviders(<SignUpScreen />);
    await fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Sign up failed', 'Email taken');
    });
  });

  test('opens the sign-in deep link', async () => {
    const {getByText} = await renderWithProviders(<SignUpScreen />);
    await fireEvent.press(getByText('Already have an account? Sign in'));
    expect(Linking.openURL).toHaveBeenCalledWith(signInHref);
  });
});
