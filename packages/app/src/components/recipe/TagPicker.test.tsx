import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {
  renderWithProviders,
  settleAsyncUpdates,
} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {TagPicker} from './TagPicker';

jest.mock('../../lib/api');

const mockList = api.tags.list as jest.Mock;
const onChange = jest.fn();

describe('TagPicker', () => {
  beforeEach(() => {
    mockList.mockResolvedValue([
      {
        id: 't1',
        name: 'Dinner',
        color: '#6366f1',
        userId: null,
        isPreset: true,
      },
    ]);
  });

  test('renders tags and toggles selection', async () => {
    const {findByText} = await renderWithProviders(
      <TagPicker
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    await fireEvent.press(await findByText('Dinner'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['t1']);
    });
  });

  test('deselects tag when already selected', async () => {
    const {findByText} = await renderWithProviders(
      <TagPicker
        selectedIds={['t1']}
        onChange={onChange}
      />,
    );
    await fireEvent.press(await findByText('Dinner'));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  test('shows loading state', async () => {
    mockList.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const {getByLabelText, unmount} = await renderWithProviders(
      <TagPicker
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    expect(getByLabelText('Loading')).toBeTruthy();
    await unmount();
    await settleAsyncUpdates();
  });
});
