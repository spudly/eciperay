import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {TagsScreen} from './TagsScreen';

jest.mock('../lib/api');

const mockList = api.tags.list as jest.Mock;
const mockCreate = api.tags.create as jest.Mock;
const mockDelete = api.tags.delete as jest.Mock;

describe('TagsScreen', () => {
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
    mockCreate.mockResolvedValue({});
    mockDelete.mockImplementation(async () => {});
  });

  test('lists tags and creates new tag', async () => {
    const {findByText, getByPlaceholderText, getByText} =
      await renderWithProviders(<TagsScreen />);
    expect(await findByText('Dinner')).toBeTruthy();
    await fireEvent.changeText(getByPlaceholderText('Tag name'), 'Lunch');
    await fireEvent.press(getByText('Add'));
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith('Lunch', '#6366f1');
    });
  });

  test('deletes tag', async () => {
    const {findByText} = await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('t1');
    });
  });

  test('ignores empty tag name', async () => {
    const {getByText, findByText} = await renderWithProviders(<TagsScreen />);
    await findByText('Dinner');
    await fireEvent.press(getByText('Add'));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
