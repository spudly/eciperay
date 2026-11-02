import React from 'react';
import {renderHook, act} from '@testing-library/react';
import type {SupabaseClient} from '@supabase/supabase-js';

import {
  AuthProvider,
  AuthSessionRejectedError,
  useAuth,
} from './AuthProvider.js';

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

  test('clears the session when onAuthenticated rejects with a session-rejected error during an auth state change', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const onAuthenticated = jest.fn(async () => {
      throw new AuthSessionRejectedError(
        'sign-out failed after token rejection',
      );
    });
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
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
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  test('does not discard a newer session when an earlier onAuthenticated rejects', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    let rejectFirst: (error: Error) => void = () => {};
    const firstAttempt = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const onAuthenticated = jest.fn((session: {access_token: string}) =>
      session.access_token === 'old-token' ? firstAttempt : Promise.resolve(),
    );
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    const oldSession = {access_token: 'old-token', user: {id: 'u2'}};
    const newSession = {access_token: 'new-token', user: {id: 'u2'}};
    act(() => {
      callback('SIGNED_IN', oldSession);
      callback('TOKEN_REFRESHED', newSession);
    });
    expect(result.current.session).toEqual(newSession);
    await act(async () => {
      rejectFirst(new AuthSessionRejectedError('stale lifecycle failure'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(newSession);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  test('preserves the session when onAuthenticated rejects with a transient 503 during TOKEN_REFRESHED', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const onAuthenticated = jest.fn(async () => {
      throw Object.assign(new Error('API error 503: /auth/sync'), {
        status: 503,
      });
    });
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'xyz', user: {id: 'u2'}};
    act(() => {
      callback('TOKEN_REFRESHED', newSession);
    });
    expect(result.current.session).toEqual(newSession);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(newSession);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  test('does not discard a newer session when the restored session onAuthenticated later rejects with a session-rejected error', async () => {
    const {client, getSession, onAuthStateChange} = makeSupabase();
    const restoredSession = {access_token: 'restored-token'};
    getSession.mockResolvedValue({data: {session: restoredSession}});
    let rejectRestored: (error: Error) => void = () => {};
    const restoredAttempt = new Promise<void>((_resolve, reject) => {
      rejectRestored = reject;
    });
    const onAuthenticated = jest.fn(
      (session: {access_token: string}) =>
        session.access_token === 'restored-token'
          ? restoredAttempt
          : Promise.resolve(),
    );
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(restoredSession);
    const callback = onAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'new-token'};
    act(() => {
      callback('SIGNED_IN', newSession);
    });
    expect(result.current.session).toEqual(newSession);
    await act(async () => {
      rejectRestored(
        new AuthSessionRejectedError('stale recovery failure'),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(newSession);
    expect(onSignedOut).not.toHaveBeenCalled();
  });

  test('clears a restored session when onAuthenticated rejects with a session-rejected error and no newer session replaced it', async () => {
    const {client, getSession} = makeSupabase();
    const session = {access_token: 'restored-token'};
    getSession.mockResolvedValue({data: {session}});
    const onAuthenticated = jest.fn(async () => {
      throw new AuthSessionRejectedError(
        'sign-out failed after token rejection',
      );
    });
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  test('routes a synchronously throwing onAuthenticated through the auth-event recovery path', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const onAuthenticated = jest.fn(() => {
      throw new AuthSessionRejectedError(
        'sign-out failed after token rejection',
      );
    });
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    const newSession = {access_token: 'token-1'};
    act(() => {
      callback('SIGNED_IN', newSession);
    });
    expect(result.current.session).toEqual(newSession);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  test('preserves a restored session when onAuthenticated rejects with an ordinary sync failure', async () => {
    const {client, getSession} = makeSupabase();
    const session = {access_token: 'abc', user: {id: 'u1'}};
    getSession.mockResolvedValue({data: {session}});
    const onAuthenticated = jest.fn(async () => {
      throw Object.assign(new Error('API error 503: /auth/sync'), {
        status: 503,
      });
    });
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onAuthenticated={onAuthenticated}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.session).toEqual(session);
    expect(result.current.isLoading).toBe(false);
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

  test('calls onSignedOut when auth state changes to null', async () => {
    const {client, onAuthStateChange} = makeSupabase();
    const onSignedOut = jest.fn();
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider
        supabase={client}
        onSignedOut={onSignedOut}
      >
        {children}
      </AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    const callback = onAuthStateChange.mock.calls[0][0];
    act(() => {
      callback('SIGNED_IN', {access_token: 'xyz', user: {id: 'u2'}});
    });
    expect(result.current.session).not.toBeNull();
    act(() => {
      callback('SIGNED_OUT', null);
    });
    expect(onSignedOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });

  test('sets isLoading false when getSession rejects', async () => {
    const {client, getSession} = makeSupabase();
    getSession.mockRejectedValue(new Error('network'));
    const wrapper = ({children}: {children: React.ReactNode}) => (
      <AuthProvider supabase={client}>{children}</AuthProvider>
    );
    const {result} = renderHook(() => useAuth(), {wrapper});
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
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
