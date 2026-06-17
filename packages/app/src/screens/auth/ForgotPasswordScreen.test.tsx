import React from 'react';
import {Alert} from 'react-native';
import {act, render, fireEvent, waitFor} from '@testing-library/react-native';

import {supabase} from '../../lib/supabase';

import {ForgotPasswordScreen} from './ForgotPasswordScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {resetPasswordForEmail: jest.fn()}},
}));

const mockReset = supabase.auth.resetPasswordForEmail as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
const mockGoBack = jest.fn();
const nav = {goBack: mockGoBack};

describe('ForgotPasswordScreen', () => {
  test('renders email field and send button', () => {
    const {getByLabelText, getByText} = render(
      <ForgotPasswordScreen navigation={nav} />,
    );
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByText('Send Reset Link')).toBeTruthy();
  });

  test('calls resetPasswordForEmail on submit', async () => {
    mockReset.mockResolvedValue({error: null});
    const {getByLabelText, getByText} = render(
      <ForgotPasswordScreen navigation={nav} />,
    );
    // Flush React 19 concurrent state updates before pressing
    await act(async () => {
      fireEvent.changeText(getByLabelText('Email'), 'user@test.com');
      await Promise.resolve(); // flush React 19 concurrent state updates
    });
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('user@test.com');
    });
  });

  test('shows success alert and goes back on success', async () => {
    mockReset.mockResolvedValue({error: null});
    const {getByText} = render(<ForgotPasswordScreen navigation={nav} />);
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Check your email',
        expect.any(String),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  test('shows error alert on failure', async () => {
    mockReset.mockResolvedValue({error: new Error('User not found')});
    const {getByText} = render(<ForgotPasswordScreen navigation={nav} />);
    fireEvent.press(getByText('Send Reset Link'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'User not found');
    });
  });
});
