import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {supabase} from '../../lib/supabase';

import {ResetPasswordScreen} from './ResetPasswordScreen';

jest.mock('../../lib/supabase', () => ({
  supabase: {auth: {updateUser: jest.fn()}},
}));

const mockUpdateUser = supabase.auth.updateUser as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockReturnValue();
const mockOnComplete = jest.fn();

describe('ResetPasswordScreen', () => {
  test('updates password and completes recovery flow', async () => {
    mockUpdateUser.mockResolvedValue({error: null});
    const {getByLabelText, getByText} = render(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
    );

    await act(async () => {
      fireEvent.changeText(getByLabelText('New password'), 'new-password');
      await Promise.resolve();
    });
    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({password: 'new-password'});
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        'Password updated',
        expect.any(String),
      );
    });
  });

  test('shows error alert on failure', async () => {
    mockUpdateUser.mockResolvedValue({error: new Error('Update failed')});
    const {getByText} = render(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
    );

    fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Update failed');
    });
  });
});
