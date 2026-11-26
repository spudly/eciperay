import type {Entitlement} from '@eciperay/types';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {screen, waitFor} from '@testing-library/react-native';
import {Text} from 'react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {useAccessTokensProps} from './AccessTokensSection';

jest.mock('../../lib/api', () => ({
  api: {
    account: {
      listPersonalAccessTokens: jest.fn(),
      createPersonalAccessToken: jest.fn(),
      revokePersonalAccessToken: jest.fn(),
      getEntitlement: jest.fn(),
    },
  },
}));

const mockList = jest.mocked(api.account.listPersonalAccessTokens);
const mockEntitlement = jest.mocked(api.account.getEntitlement);

const makeEntitlement = (plan: Entitlement['plan']): Entitlement => ({
  plan,
  status: plan === 'free' ? null : 'active',
  aiUsed: 0,
  aiLimit: 100,
  periodEndsAt: null,
  paddleCustomerId: null,
  cancelAtPeriodEnd: false,
});

// DS 14: the section is a hook returning ProfilePage's accessTokens
// data prop, so a probe renders the view-model values the DS panel
// renders from (the plan notice replaces the create form when set;
// token rows carry their meta line as data).
const Probe = () => {
  const props = useAccessTokensProps();
  return (
    <>
      <Text>{props.planNotice ?? 'NO_PLAN_NOTICE'}</Text>
      {props.tokens.map(token => (
        <Text key={token.id}>{token.metaLabel}</Text>
      ))}
    </>
  );
};

const renderProbe = async () => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  await renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
};

describe('useAccessTokensProps (app)', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockEntitlement.mockReset();
    mockList.mockResolvedValue([]);
  });

  test('no plan notice for a Power user', async () => {
    mockEntitlement.mockResolvedValue(makeEntitlement('power'));
    await renderProbe();
    await waitFor(() => {
      expect(screen.getByText('NO_PLAN_NOTICE')).toBeTruthy();
    });
    expect(
      screen.queryByText(/API access tokens are a Power feature/),
    ).toBeNull();
  });

  test('Power explainer notice for a Plus user', async () => {
    mockEntitlement.mockResolvedValue(makeEntitlement('plus'));
    await renderProbe();
    await waitFor(() => {
      expect(
        screen.getByText(/API access tokens are a Power feature/),
      ).toBeTruthy();
    });
    expect(screen.getByText(/You're on the Plus plan/)).toBeTruthy();
  });

  test('renders token meta from the en-XA Lingui catalog (#465)', async () => {
    mockEntitlement.mockResolvedValue(makeEntitlement('power'));
    mockList.mockResolvedValue([
      {
        id: 'token-1',
        name: 'My token',
        tokenPrefix: 'eci_abc',
        createdAt: '2026-01-02T00:00:00.000Z',
        lastUsedAt: null,
        revokedAt: null,
      } as never,
      {
        id: 'token-2',
        name: 'Used token',
        tokenPrefix: 'eci_def',
        createdAt: '2026-01-02T00:00:00.000Z',
        lastUsedAt: '2026-02-03T00:00:00.000Z',
        revokedAt: null,
      } as never,
    ]);
    await renderWithProviders(<Probe />, {locale: 'en-XA'});
    // The full-line anchors require the pseudo-locale marker on the
    // created label itself, not just on the trailing last-used label.
    await waitFor(() => {
      expect(screen.getByText(/^Created [^~]+~ · Never used~$/)).toBeTruthy();
    });
    // The dated last-used branch is covered too: reverting it to
    // English would drop its marker and fail this line.
    expect(
      screen.getByText(/^Created [^~]+~ · Last used [^~]+~$/),
    ).toBeTruthy();
  });

  test('falls back to no notice when the entitlement fails to load', async () => {
    mockEntitlement.mockRejectedValue(new Error('entitlement down'));
    await renderProbe();
    await waitFor(() => {
      expect(screen.getByText('NO_PLAN_NOTICE')).toBeTruthy();
    });
  });
});
