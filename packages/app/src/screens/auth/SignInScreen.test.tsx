import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';
import {supabase} from '../../lib/supabase';

import {SignInScreen} from './SignInScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {signInWithPassword: jest.fn()}},
}));
jest.mock('../../lib/api');

const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockSyncUser = api.auth.syncUser as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

describe('SignInScreen', () => {
  test('renders email and password fields', async () => {
    const {getByLabelText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
  });

  test('calls signInWithPassword on submit', async () => {
    mockSignIn.mockResolvedValue({error: null});
    mockSyncUser.mockImplementation(async () => {});
    const {getByLabelText, getByText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    await act(async () => {
      await fireEvent.changeText(getByLabelText('Email'), 'user@test.com');
      await fireEvent.changeText(getByLabelText('Password'), 'secret');
      await Promise.resolve();
    });
    await fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'secret',
      });
    });
  });

  test('calls auth sync on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({error: null});
    mockSyncUser.mockImplementation(async () => {});
    const {getByText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    await fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockSyncUser).toHaveBeenCalled();
    });
  });

  test('shows error alert on sign-in failure', async () => {
    mockSignIn.mockResolvedValue({error: new Error('Invalid credentials')});
    const {getByText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    await fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Sign in failed',
        'Invalid credentials',
      );
    });
  });

  test('navigates to SignUp when create account link pressed', async () => {
    const {getByText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    await fireEvent.press(getByText('Create an account'));
    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  test('navigates to ForgotPassword when link pressed', async () => {
    const {getByText} = await renderWithProviders(
      <SignInScreen navigation={nav} />,
    );
    await fireEvent.press(getByText('Forgot password?'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
