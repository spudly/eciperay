import React from 'react';

import {makeCookLog, VERSION_ID} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {CookHistoryTab} from './CookHistoryTab';

jest.mock('../../lib/api');

const mockListCookLogs = api.cookLogs.list as jest.Mock;

describe('CookHistoryTab', () => {
  beforeEach(() => {
    mockListCookLogs.mockResolvedValue([makeCookLog()]);
  });

  test('renders cook log timeline', async () => {
    const {findByText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(await findByText('Turned out great')).toBeTruthy();
  });

  test('renders empty state', async () => {
    mockListCookLogs.mockResolvedValue([]);
    const {findByText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(await findByText(/No cooks logged yet/)).toBeTruthy();
  });

  test('renders loading state', () => {
    mockListCookLogs.mockImplementation(() => new Promise(() => {}));
    const {getByText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(getByText('Loading cook history…')).toBeTruthy();
  });

  test('renders cook log without rating or notes', async () => {
    mockListCookLogs.mockResolvedValue([
      makeCookLog({authorStarRating: null, notes: null}),
    ]);
    const {findByText, queryByLabelText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(await findByText(/Jan/)).toBeTruthy();
    expect(queryByLabelText(/stars/)).toBeNull();
  });
});
