import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

import {supabase} from '../lib/supabase';

import {ProfileScreen} from './ProfileScreen';

jest.mock('../lib/supabase', () => ({
  supabase: {auth: {signOut: jest.fn().mockResolvedValue({})}},
}));

const mockSignOut = supabase.auth.signOut as jest.Mock;

describe('ProfileScreen', () => {
  test('renders sign out button', () => {
    const {getByText} = render(<ProfileScreen />);
    expect(getByText('Sign Out')).toBeTruthy();
  });

  test('calls supabase.auth.signOut when sign out button pressed', async () => {
    const {getByText} = render(<ProfileScreen />);
    fireEvent.press(getByText('Sign Out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
