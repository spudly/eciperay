import type {PersonalAccessToken} from '@eciperay/types';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {AccessTokensView} from './AccessTokensView.js';

const token: PersonalAccessToken = {
  id: 'token-uuid-1',
  name: 'Claude Desktop',
  tokenPrefix: 'ecp_abcdefgh',
  createdAt: '2026-10-12T00:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
};

const renderView = async (
  props: Partial<Parameters<typeof AccessTokensView>[0]>,
) =>
  renderWithProviders(
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
    {withAuth: false},
  );

describe('AccessTokensView', () => {
  test('shows the create form when no plan notice is set', async () => {
    await renderView({});
    expect(screen.getByLabelText('Token name')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Create token'}),
    ).toBeInTheDocument();
  });

  test('plan notice replaces the create form but keeps the token list', async () => {
    const onRevoke = vi.fn();
    await renderView({
      tokens: [token],
      onRevoke,
      planNotice:
        "API access tokens are a Power feature ($8.99/mo). You're on the Free plan — upgrade to create tokens.",
    });
    expect(
      screen.getByText(/API access tokens are a Power feature/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Token name')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: 'Create token'}),
    ).not.toBeInTheDocument();
    // Existing tokens stay listed and revocable below Power.
    expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: /revoke/i}));
    expect(onRevoke).toHaveBeenCalledWith('token-uuid-1');
  });
});
