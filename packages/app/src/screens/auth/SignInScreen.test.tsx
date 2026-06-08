import React from 'react';
import {Alert} from 'react-native';
import {act, render, fireEvent, waitFor} from '@testing-library/react-native';

import {supabase} from '../../lib/supabase';
import {apiFetch} from '../../lib/api';

import {SignInScreen} from './SignInScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {signInWithPassword: jest.fn()}},
}));

jest.mock('../../lib/api', () => ({apiFetch: jest.fn().mockResolvedValue({})}));

const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockApiFetch = apiFetch as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

describe('SignInScreen', () => {
  test('renders email and password fields', () => {
    const {getByPlaceholderText} = render(<SignInScreen navigation={nav} />);
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  test('calls signInWithPassword on submit', async () => {
    mockSignIn.mockResolvedValue({error: null});
    const {getByPlaceholderText, getByText} = render(
      <SignInScreen navigation={nav} />,
    );
    // Flush React 19 concurrent state updates from the text inputs before pressing
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'user@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'secret');
      await Promise.resolve(); // flush React 19 concurrent state updates
    });
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'secret',
      });
    });
  });

  test('calls apiFetch /auth/sync on successful sign-in', async () => {
    mockSignIn.mockResolvedValue({error: null});
    const {getByText} = render(<SignInScreen navigation={nav} />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/auth/sync',
        expect.any(Object),
      );
    });
  });

  test('shows error alert on sign-in failure', async () => {
    mockSignIn.mockResolvedValue({error: new Error('Invalid credentials')});
    const {getByText} = render(<SignInScreen navigation={nav} />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Sign in failed',
        'Invalid credentials',
      );
    });
  });

  test('navigates to SignUp when create account link pressed', () => {
    const {getByText} = render(<SignInScreen navigation={nav} />);
    fireEvent.press(getByText('Create an account'));
    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  test('navigates to ForgotPassword when link pressed', () => {
    const {getByText} = render(<SignInScreen navigation={nav} />);
    fireEvent.press(getByText('Forgot password?'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });
});
