import React from 'react';
import {Alert} from 'react-native';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

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
const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

describe('SignUpScreen', () => {
  test('renders sign up form', () => {
    const {getByPlaceholderText} = render(<SignUpScreen navigation={nav} />);
    expect(getByPlaceholderText('Your name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  test('syncs user when session is returned', async () => {
    mockSignUp.mockResolvedValue({data: {session: {}}, error: null});
    mockSyncUser.mockResolvedValue();
    const {getByText} = render(<SignUpScreen navigation={nav} />);
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => {
      expect(mockSyncUser).toHaveBeenCalled();
    });
  });

  test('shows confirmation alert when email confirmation required', async () => {
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

  test('shows error alert on sign up failure', async () => {
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

  test('navigates to SignIn', () => {
    const {getByText} = render(<SignUpScreen navigation={nav} />);
    fireEvent.press(getByText('Already have an account? Sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });
});
