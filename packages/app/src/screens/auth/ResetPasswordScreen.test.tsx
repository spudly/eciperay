import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
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
    const {getByLabelText, getByText} = await renderWithProviders(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
    );

    await act(async () => {
      await fireEvent.changeText(
        getByLabelText('New password'),
        'new-password',
      );
      await Promise.resolve();
    });
    await fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({password: 'new-password'});
      expect(mockOnComplete).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith(
        'Password updated',
        expect.any(String),
      );
    });
  });

  test('shows the success alert from the en-XA Lingui catalog (#465)', async () => {
    mockUpdateUser.mockResolvedValue({error: null});
    const {getByLabelText, getByText} = await renderWithProviders(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
      {locale: 'en-XA'},
    );
    await act(async () => {
      await fireEvent.changeText(
        getByLabelText('New password'),
        'new-password',
      );
      await Promise.resolve();
    });
    await fireEvent.press(getByText('Update password'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Password updated~',
        'Your new password is set — use it to sign in from here on.~',
      );
    });
  });

  test('shows the error alert title from the en-XA Lingui catalog (#465)', async () => {
    mockUpdateUser.mockResolvedValue({error: new Error('Update failed')});
    const {getByText} = await renderWithProviders(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
      {locale: 'en-XA'},
    );
    await fireEvent.press(getByText('Update password'));
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error~', 'Update failed');
    });
  });

  test('shows error alert on failure', async () => {
    mockUpdateUser.mockResolvedValue({error: new Error('Update failed')});
    const {getByText} = await renderWithProviders(
      <ResetPasswordScreen onComplete={mockOnComplete} />,
    );

    await fireEvent.press(getByText('Update password'));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Error', 'Update failed');
    });
  });
});
