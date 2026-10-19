import type {Entitlement} from '@eciperay/types';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {AccessTokensSection} from './AccessTokensSection';

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

const renderSection = async () => {
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  await renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <AccessTokensSection />
    </QueryClientProvider>,
  );
};

describe('AccessTokensSection (app)', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockEntitlement.mockReset();
    mockList.mockResolvedValue([]);
  });

  test('shows the create form for a Power user', async () => {
    mockEntitlement.mockResolvedValue(makeEntitlement('power'));
    await renderSection();
    await waitFor(() => {
      expect(screen.getByText('Create token')).toBeTruthy();
    });
    expect(
      screen.queryByText(/API access tokens are a Power feature/),
    ).toBeNull();
  });

  test('shows the Power explainer instead of the form for a Plus user', async () => {
    mockEntitlement.mockResolvedValue(makeEntitlement('plus'));
    await renderSection();
    await waitFor(() => {
      expect(
        screen.getByText(/API access tokens are a Power feature/),
      ).toBeTruthy();
    });
    expect(screen.getByText(/You're on the Plus plan/)).toBeTruthy();
    expect(screen.queryByText('Create token')).toBeNull();
  });

  test('falls back to the form when the entitlement fails to load', async () => {
    mockEntitlement.mockRejectedValue(new Error('entitlement down'));
    await renderSection();
    await waitFor(() => {
      expect(screen.getByText('Create token')).toBeTruthy();
    });
  });
});
