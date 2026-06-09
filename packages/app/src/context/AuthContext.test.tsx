import React from 'react';
import {renderHook, act} from '@testing-library/react-native';

import {supabase} from '../lib/supabase';

import {AuthProvider, useAuth} from './AuthContext';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({data: {subscription: {unsubscribe: jest.fn()}}}),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-deprecated -- using in mock context only
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

const wrapper = ({children}: {children: React.ReactNode}) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({data: {session: null}});
    mockOnAuthStateChange.mockReturnValue({
      data: {subscription: {unsubscribe: jest.fn()}},
    });
  });

  test('starts with isLoading: true and session: null', () => {
    // Use a pending promise so getSession never resolves — this lets us check
    // the true initial state without any async state update firing outside act().
    mockGetSession.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  test('sets isLoading to false after getSession resolves', async () => {
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);
  });

  test('sets session when getSession returns a session', async () => {
    const fakeSession = {access_token: 'abc', user: {id: 'u1'}};
    mockGetSession.mockResolvedValue({data: {session: fakeSession}});
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(fakeSession);
  });

  test('updates session when onAuthStateChange fires', async () => {
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const changeCallback = mockOnAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'xyz', user: {id: 'u2'}};
    act(() => {
      changeCallback('SIGNED_IN', newSession);
    });
    expect(result.current.session).toEqual(newSession);
  });

  test('calls unsubscribe on unmount', async () => {
    const mockUnsub = jest.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: {subscription: {unsubscribe: mockUnsub}},
    });
    const {unmount} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
    expect(mockUnsub).toHaveBeenCalledTimes(1);
  });

  test('useAuth returns default context when used outside AuthProvider', () => {
    const {result} = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
