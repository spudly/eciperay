import React from 'react';
import type {PersonalAccessToken} from '@eciperay/types';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {TamaguiProvider} from 'tamagui';
import {tamaguiConfig} from '@spudly/ui';

import {AccessTokensView} from './AccessTokensView';

const token: PersonalAccessToken = {
  id: 'token-uuid-1',
  name: 'Claude Desktop',
  tokenPrefix: 'ecp_abcdefgh',
  createdAt: '2026-10-12T00:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
};

const renderView = async (
  props: Partial<React.ComponentProps<typeof AccessTokensView>>,
) =>
  render(
    <AccessTokensView
      tokens={[]}
      isLoading={false}
      tokenName=""
      onTokenNameChange={() => {}}
      onCreate={() => {}}
      isCreating={false}
      createdSecret={null}
      onDismissSecret={() => {}}
      revokingId={null}
      onRevoke={() => {}}
      error={null}
      {...props}
    />,
    {
      wrapper: ({children}) => (
        <TamaguiProvider
          config={tamaguiConfig}
          defaultTheme="light"
        >
          {children}
        </TamaguiProvider>
      ),
    },
  );

describe('AccessTokensView (app)', () => {
  test('shows the create form when no plan notice is set', async () => {
    await renderView({});
    expect(screen.getByText('Create token')).toBeTruthy();
  });

  test('plan notice replaces the create form but keeps the token list', async () => {
    const onRevoke = jest.fn();
    await renderView({
      tokens: [token],
      onRevoke,
      planNotice:
        "API access tokens are a Power feature ($8.99/mo). You're on the Free plan — upgrade to create tokens.",
    });
    expect(
      screen.getByText(/API access tokens are a Power feature/),
    ).toBeTruthy();
    expect(screen.queryByText('Create token')).toBeNull();
    expect(screen.getByText('Claude Desktop')).toBeTruthy();
    await fireEvent.press(screen.getByText('Revoke'));
    expect(onRevoke).toHaveBeenCalledWith('token-uuid-1');
  });
});
