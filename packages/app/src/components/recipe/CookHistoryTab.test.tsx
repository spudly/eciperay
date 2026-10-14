import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeCookLog, VERSION_ID} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {CookHistoryTab} from './CookHistoryTab';

jest.mock('../../lib/api');

const mockListCookLogs = api.cookLogs.list as jest.Mock;
const mockCreateCookLog = api.cookLogs.create as jest.Mock;

describe('CookHistoryTab', () => {
  beforeEach(() => {
    mockListCookLogs.mockResolvedValue([makeCookLog()]);
    mockCreateCookLog.mockResolvedValue(makeCookLog());
  });

  test('renders cook log timeline', async () => {
    const {findByText, getByText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(await findByText('Turned out great')).toBeTruthy();
    expect(getByText('Log a cook')).toBeTruthy();
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
    expect(
      await findByText(/Log a cook here or finish a cooking session/),
    ).toBeTruthy();
  });

  test('logs a cook without cooking mode', async () => {
    mockListCookLogs.mockResolvedValue([]);
    const {findByText, getByLabelText, getByPlaceholderText, getByText} =
      renderWithProviders(
        <CookHistoryTab
          recipeId="recipe-uuid-1"
          versionId={VERSION_ID}
        />,
      );
    fireEvent.press(await findByText('Log a cook'));
    fireEvent.press(getByLabelText('Rate 5 out of 5 stars'));
    fireEvent.changeText(
      getByPlaceholderText('Notes from this cook (optional)'),
      'Quick weeknight cook',
    );
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(mockCreateCookLog).toHaveBeenCalledWith(
        'recipe-uuid-1',
        VERSION_ID,
        {authorStarRating: 5, notes: 'Quick weeknight cook'},
      );
    });
    expect(getByText('Log a cook')).toBeTruthy();
  });

  test('cancels log cook form', async () => {
    const {findByText, getByText, queryByText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    fireEvent.press(await findByText('Log a cook'));
    fireEvent.press(getByText('Cancel'));
    expect(queryByText('How did it go?')).toBeNull();
  });

  test('renders loading state', () => {
    mockListCookLogs.mockImplementation(() => new Promise(() => {}));
    const {getByLabelText} = renderWithProviders(
      <CookHistoryTab
        recipeId="recipe-uuid-1"
        versionId={VERSION_ID}
      />,
    );
    expect(getByLabelText('Loading')).toBeTruthy();
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
