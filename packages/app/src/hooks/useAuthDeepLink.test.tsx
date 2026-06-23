import React from 'react';
import {Alert, Linking, Text, TouchableOpacity, View} from 'react-native';
import type {SupabaseClient} from '@supabase/supabase-js';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';

import {AUTH_DEEP_LINK_REDIRECT_URL} from '../lib/authDeepLink';

import {useAuthDeepLink} from './useAuthDeepLink';

const mockCreateSessionFromAuthDeepLink = jest.fn();

jest.mock('../lib/authDeepLink', () => {
  const actual = jest.requireActual('../lib/authDeepLink');
  return {
    ...actual,
    createSessionFromAuthDeepLink: (...args: unknown[]) =>
      mockCreateSessionFromAuthDeepLink(...args),
  };
});

jest.mock('@eciperay/client', () => ({
  errorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Unknown error',
}));

const devAuthCallback = `${AUTH_DEEP_LINK_REDIRECT_URL}?code=abc`;
const devAuthCallbackLive = `${AUTH_DEEP_LINK_REDIRECT_URL}?code=live`;
const devAuthCallbackBad = `${AUTH_DEEP_LINK_REDIRECT_URL}?code=bad`;

const makeSupabase = () => {
  const unsubscribe = jest.fn();
  const onAuthStateChange = jest
    .fn()
    .mockReturnValue({data: {subscription: {unsubscribe}}});
  return {
    supabase: {auth: {onAuthStateChange}} as unknown as SupabaseClient,
    onAuthStateChange,
    unsubscribe,
  };
};

let linkListener: ((event: {url: string}) => void) | undefined;
const mockRemoveListener = jest.fn();

const HookProbe = ({supabase}: {supabase: SupabaseClient}) => {
  const {needsPasswordReset, clearPasswordRecovery} = useAuthDeepLink(supabase);

  return (
    <View>
      <Text testID="needs-reset">{needsPasswordReset ? 'yes' : 'no'}</Text>
      <TouchableOpacity
        testID="clear"
        onPress={clearPasswordRecovery}
      >
        <Text>clear</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('useAuthDeepLink', () => {
  beforeEach(() => {
    linkListener = undefined;
    mockCreateSessionFromAuthDeepLink.mockResolvedValue({session: null});
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockImplementation((_event, cb) => {
      linkListener = cb;
      return {remove: mockRemoveListener} as unknown as ReturnType<
        typeof Linking.addEventListener
      >;
    });
    jest.spyOn(Alert, 'alert').mockReturnValue();
  });

  test('starts without a pending password reset', () => {
    const {supabase} = makeSupabase();
    const {getByTestId} = render(<HookProbe supabase={supabase} />);
    expect(getByTestId('needs-reset').props.children).toBe('no');
  });

  test('marks password recovery when auth state changes', async () => {
    const {supabase, onAuthStateChange} = makeSupabase();
    const {getByTestId} = render(<HookProbe supabase={supabase} />);
    const callback = onAuthStateChange.mock.calls[0][0];

    act(() => {
      callback('PASSWORD_RECOVERY', null);
    });

    expect(getByTestId('needs-reset').props.children).toBe('yes');
  });

  test('ignores unrelated auth state changes', () => {
    const {supabase, onAuthStateChange} = makeSupabase();
    const {getByTestId} = render(<HookProbe supabase={supabase} />);
    const callback = onAuthStateChange.mock.calls[0][0];

    act(() => {
      callback('SIGNED_IN', null);
    });

    expect(getByTestId('needs-reset').props.children).toBe('no');
  });

  test('handles the initial deep link URL', async () => {
    const {supabase} = makeSupabase();
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(devAuthCallback);

    render(<HookProbe supabase={supabase} />);

    await waitFor(() => {
      expect(mockCreateSessionFromAuthDeepLink).toHaveBeenCalledWith(
        supabase,
        devAuthCallback,
      );
    });
  });

  test('handles deep links received while the app is open', async () => {
    const {supabase} = makeSupabase();
    render(<HookProbe supabase={supabase} />);

    await act(async () => {
      linkListener?.({url: devAuthCallbackLive});
      await Promise.resolve();
    });

    expect(mockCreateSessionFromAuthDeepLink).toHaveBeenCalledWith(
      supabase,
      devAuthCallbackLive,
    );
  });

  test('ignores null and non-auth URLs', async () => {
    const {supabase} = makeSupabase();
    render(<HookProbe supabase={supabase} />);

    await act(async () => {
      linkListener?.({url: 'https://www.eciperay.com/login'});
      await Promise.resolve();
    });

    expect(mockCreateSessionFromAuthDeepLink).not.toHaveBeenCalled();
  });

  test('shows an alert when deep link session creation fails', async () => {
    const {supabase} = makeSupabase();
    mockCreateSessionFromAuthDeepLink.mockRejectedValue(new Error('bad link'));
    render(<HookProbe supabase={supabase} />);

    await act(async () => {
      linkListener?.({url: devAuthCallbackBad});
      await Promise.resolve();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Sign in failed', 'bad link');
  });

  test('clears the password recovery state', async () => {
    const {supabase, onAuthStateChange} = makeSupabase();
    const {getByTestId} = render(<HookProbe supabase={supabase} />);
    const callback = onAuthStateChange.mock.calls[0][0];

    act(() => {
      callback('PASSWORD_RECOVERY', null);
    });
    fireEvent.press(getByTestId('clear'));

    expect(getByTestId('needs-reset').props.children).toBe('no');
  });

  test('unsubscribes from auth and link listeners on unmount', async () => {
    const {supabase, unsubscribe} = makeSupabase();
    const {unmount} = render(<HookProbe supabase={supabase} />);

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(mockRemoveListener).toHaveBeenCalled();
  });
});
