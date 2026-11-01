import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {TagsScreen} from './TagsScreen';

jest.mock('../lib/api');

const mockList = api.tags.list as jest.Mock;
const mockCreate = api.tags.create as jest.Mock;
const mockUpdate = api.tags.update as jest.Mock;
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
    mockUpdate.mockResolvedValue({});
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

  test('renames tag in place through the inline edit form', async () => {
    const {findByText, getByDisplayValue, getByText} =
      await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Edit'));
    // The edit form is seeded from the tag. A rename-only save sends no
    // color: the stored hex survives untouched (the palette-name
    // projection is lossy for non-palette colors).
    const editField = getByDisplayValue('Dinner');
    await fireEvent.changeText(editField, 'Supper');
    await fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('t1', {name: 'Supper'});
    });
  });

  test('sends the new color hex when the edit changes the swatch', async () => {
    const {findByText, getAllByLabelText, getByText} =
      await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Edit'));
    // The edit form's swatches follow the create form's, so the edit
    // form's green swatch is the second one rendered.
    const greenSwatches = getAllByLabelText('Select color green');
    await fireEvent.press(greenSwatches[1]!);
    await fireEvent.press(getByText('Save'));
    // Only the changed field is sent: the name is left out, so a save
    // seeded from a stale list can never write the old name back.
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('t1', {color: '#22c55e'});
    });
  });

  test('sends both fields when the edit renames and recolors', async () => {
    const {findByText, getAllByLabelText, getByDisplayValue, getByText} =
      await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Edit'));
    await fireEvent.changeText(getByDisplayValue('Dinner'), 'Supper');
    const greenSwatches = getAllByLabelText('Select color green');
    await fireEvent.press(greenSwatches[1]!);
    await fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('t1', {
        name: 'Supper',
        color: '#22c55e',
      });
    });
  });

  test('a name typed then restored to its original value is not sent', async () => {
    const {findByText, getAllByLabelText, getByDisplayValue, getByText} =
      await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Edit'));
    const editField = getByDisplayValue('Dinner');
    await fireEvent.changeText(editField, 'Supper');
    await fireEvent.changeText(editField, 'Dinner');
    const greenSwatches = getAllByLabelText('Select color green');
    await fireEvent.press(greenSwatches[1]!);
    await fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('t1', {color: '#22c55e'});
    });
  });

  test('saving an unchanged edit just closes the editor', async () => {
    const {findByText, getByText, queryByText} = await renderWithProviders(
      <TagsScreen />,
    );
    await fireEvent.press(await findByText('Edit'));
    await fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(queryByText('Save')).toBeNull();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('ignores edit starts while a save is pending', async () => {
    mockList.mockResolvedValue([
      {
        id: 't1',
        name: 'Dinner',
        color: '#6366f1',
        userId: null,
        isPreset: true,
      },
      {
        id: 't2',
        name: 'Quick',
        color: '#22c55e',
        userId: 'user-uuid-1',
        isPreset: false,
      },
    ]);
    // The save never lands, so the mutation stays pending.
    mockUpdate.mockImplementation(() => new Promise(() => {}));
    const {
      findByText,
      findAllByText,
      getByDisplayValue,
      getByText,
      queryByDisplayValue,
    } = await renderWithProviders(<TagsScreen />);
    await fireEvent.press((await findAllByText('Edit'))[0]!);
    await fireEvent.changeText(getByDisplayValue('Dinner'), 'Supper');
    await fireEvent.press(getByText('Save'));
    // Starting the other tag's edit while the save is in flight is
    // ignored, so the pending draft survives.
    await fireEvent.press((await findAllByText('Edit'))[0]!);
    expect(getByDisplayValue('Supper')).toBeTruthy();
    expect(queryByDisplayValue('Quick')).toBeNull();
    expect(await findByText('Save')).toBeTruthy();
  });

  test('cancelling an edit discards the draft', async () => {
    const {findByText, getByDisplayValue, getByText, queryByText} =
      await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Edit'));
    await fireEvent.changeText(getByDisplayValue('Dinner'), 'Supper');
    await fireEvent.press(getByText('Cancel'));
    await waitFor(() => {
      expect(queryByText('Save')).toBeNull();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(await findByText('Dinner')).toBeTruthy();
  });

  test('deletes tag', async () => {
    const {findByText} = await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Delete'));
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('t1');
    });
  });

  test('a failed create shows the page error and keeps the typed name', async () => {
    mockCreate.mockRejectedValue(new Error('Server error'));
    const {findByText, getByPlaceholderText, getByText} =
      await renderWithProviders(<TagsScreen />);
    expect(await findByText('Dinner')).toBeTruthy();
    await fireEvent.changeText(getByPlaceholderText('Tag name'), 'Lunch');
    await fireEvent.press(getByText('Add'));
    // The host converts the rejected mutation to a `false` result,
    // which is what makes the DS page render its error alert (#374).
    expect(
      await findByText("Couldn't create the tag. Please try again."),
    ).toBeTruthy();
    // Only onSuccess clears the form, so the name survives to retry.
    expect(getByPlaceholderText('Tag name').props.value).toBe('Lunch');
  });

  test('a failed save shows the page error and keeps the editor open', async () => {
    mockUpdate.mockRejectedValue(new Error('Server error'));
    const {findByText, getByDisplayValue, getByText} = await renderWithProviders(
      <TagsScreen />,
    );
    await fireEvent.press(await findByText('Edit'));
    await fireEvent.changeText(getByDisplayValue('Dinner'), 'Supper');
    await fireEvent.press(getByText('Save'));
    expect(
      await findByText("Couldn't save the tag changes. Please try again."),
    ).toBeTruthy();
    // A failed save must not close the editor or lose the draft.
    expect(getByText('Save')).toBeTruthy();
    expect(getByDisplayValue('Supper')).toBeTruthy();
  });

  test('a failed delete shows the page error and keeps the tag listed', async () => {
    mockDelete.mockRejectedValue(new Error('Server error'));
    const {findByText} = await renderWithProviders(<TagsScreen />);
    await fireEvent.press(await findByText('Delete'));
    expect(
      await findByText("Couldn't delete the tag. Please try again."),
    ).toBeTruthy();
    expect(await findByText('Dinner')).toBeTruthy();
  });

  test('ignores empty tag name', async () => {
    const {getByText, findByText} = await renderWithProviders(<TagsScreen />);
    await findByText('Dinner');
    await fireEvent.press(getByText('Add'));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
