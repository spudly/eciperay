import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {ProfileScreen} from './ProfileScreen';

const mockUseAuth = jest.fn((): {session: {user: {email: string}} | null} => ({
  session: {user: {email: 'user@test.com'}},
}));

jest.mock('@recipoo/client', () => ({useAuth: () => mockUseAuth()}));

jest.mock('../lib/supabase', () => ({supabase: {auth: {signOut: jest.fn()}}}));

const mockNavigate = jest.fn();
const navigation = {navigate: mockNavigate} as never;

describe('ProfileScreen', () => {
  test('renders without email when session is missing', () => {
    mockUseAuth.mockReturnValueOnce({session: null});
    const {queryByText} = render(<ProfileScreen navigation={navigation} />);
    expect(queryByText('user@test.com')).toBeNull();
  });

  test('renders email and sign out button', () => {
    const {getByText} = render(<ProfileScreen navigation={navigation} />);
    expect(getByText('user@test.com')).toBeTruthy();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  test('signs out on button press', () => {
    const {supabase} = require('../lib/supabase');
    const {getByText} = render(<ProfileScreen navigation={navigation} />);
    fireEvent.press(getByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('navigates to Tags', () => {
    const {getByText} = render(<ProfileScreen navigation={navigation} />);
    fireEvent.press(getByText('Manage Tags'));
    expect(mockNavigate).toHaveBeenCalledWith('Tags');
  });
});
