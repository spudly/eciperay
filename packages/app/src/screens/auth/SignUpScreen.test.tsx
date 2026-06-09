import React from 'react';
import {Alert} from 'react-native';
import {act, render, fireEvent, waitFor} from '@testing-library/react-native';

import {supabase} from '../../lib/supabase';

import {SignUpScreen} from './SignUpScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {signUp: jest.fn()}},
}));

jest.mock('../../lib/api', () => ({apiFetch: jest.fn().mockResolvedValue({})}));

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

describe('SignUpScreen', () => {
  test('renders name, email, and password fields', () => {
    const {getByPlaceholderText} = render(<SignUpScreen navigation={nav} />);
    expect(getByPlaceholderText('Your name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  test('calls supabase.auth.signUp on submit', async () => {
    mockSignUp.mockResolvedValue({
      data: {session: {access_token: 'abc'}},
      error: null,
    });
    const {getByPlaceholderText, getByText} = render(
      <SignUpScreen navigation={nav} />,
    );
    // Flush React 19 concurrent state updates before pressing
    await act(async () => {
      fireEvent.changeText(getByPlaceholderText('Email'), 'user@test.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'secret123');
      await Promise.resolve(); // flush React 19 concurrent state updates
    });
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'secret123',
      });
    });
  });

  test('shows confirm email alert when no session returned', async () => {
    mockSignUp.mockResolvedValue({data: {session: null}, error: null});
    const {getByText} = render(<SignUpScreen navigation={nav} />);
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Check your email',
        expect.any(String),
      );
    });
  });

  test('shows error alert on sign-up failure', async () => {
    mockSignUp.mockResolvedValue({
      data: {session: null},
      error: new Error('Email taken'),
    });
    const {getByText} = render(<SignUpScreen navigation={nav} />);
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Sign up failed', 'Email taken');
    });
  });

  test('navigates to SignIn when link pressed', () => {
    const {getByText} = render(<SignUpScreen navigation={nav} />);
    fireEvent.press(getByText('Already have an account? Sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });
});
