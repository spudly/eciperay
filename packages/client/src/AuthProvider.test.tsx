import React from 'react';
import {renderHook, act} from '@testing-library/react';
import type {SupabaseClient} from '@supabase/supabase-js';

import {AuthProvider, useAuth} from './AuthProvider.js';

const makeSupabase = () => {
  const unsubscribe = jest.fn();
  const onAuthStateChange = jest
    .fn()
    .mockReturnValue({data: {subscription: {unsubscribe}}});
  const getSession = jest.fn().mockResolvedValue({data: {session: null}});
  return {
    client: {
      auth: {getSession, onAuthStateChange},
    } as unknown as SupabaseClient,
    getSession,
    onAuthStateChange,
    unsubscribe,
  };
};

describe('AuthProvider', () => {
  test('starts loading then resolves session', async () => {
    const {client, getSession} = makeSupabase();
    getSession.mockReturnValue(new Promise(() => {}));
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider supabase={client}>{children}</AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    expect(result.current.isLoading).toBe(true);
  });

  test('sets session after getSession resolves', async () => {
    const {client, getSession} = makeSupabase();
    const session = {access_token: 'abc', user: {id: 'u1'}};
    getSession.mockResolvedValue({data: {session}});
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider supabase={client}>{children}</AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(session);
    expect(result.current.isLoading).toBe(false);
  });

  test('updates session on auth state change', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider supabase={client}>{children}</AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'xyz', user: {id: 'u2'}};
    act(() => {
      callback('SIGNED_IN', newSession);
    });
    expect(result.current.session).toEqual(newSession);
  });

  test('calls onAuthenticated when auth state changes to a session', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const onAuthenticated = jest.fn(async () => {});
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
      >
        {children}
      </AuthProvider>
    );
    renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'xyz', user: {id: 'u2'}};
    act(() => {
      callback('SIGNED_IN', newSession);
    });
    expect(onAuthenticated).toHaveBeenCalledWith(newSession);
  });

  test('calls onAuthenticated when session is restored', async () => {
    const {client, getSession} = makeSupabase();
    const session = {access_token: 'abc', user: {id: 'u1'}};
    getSession.mockResolvedValue({data: {session}});
    const onAuthenticated = jest.fn(async () => {});
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
      >
        {children}
      </AuthProvider>
    );
    renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(onAuthenticated).toHaveBeenCalledWith(session);
  });

  test('unsubscribes on unmount', async () => {
    const {client, unsubscribe} = makeSupabase();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider supabase={client}>{children}</AuthProvider>
    );
    const {unmount} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  test('useAuth returns default outside provider', () => {
    const {result} = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
