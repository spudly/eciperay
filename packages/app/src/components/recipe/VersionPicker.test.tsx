import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeRecipeVersionSummary} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {VersionPicker} from './VersionPicker';

describe('VersionPicker', () => {
  test('shows version number when only one version exists', async () => {
    const {getByText} = await renderWithProviders(
      <VersionPicker
        versions={[makeRecipeVersionSummary()]}
        selectedVersionId="version-uuid-1"
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Version 1')).toBeTruthy();
  });

  test('defaults to version 1 when versions list is empty', async () => {
    const {getByText} = await renderWithProviders(
      <VersionPicker
        versions={[]}
        selectedVersionId=""
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Version 1')).toBeTruthy();
  });

  test('opens version selector for multiple versions', async () => {
    const onSelect = jest.fn();
    const {getByLabelText, getByText} = await renderWithProviders(
      <VersionPicker
        versions={[
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'draft',
            changeSummary: 'More spice',
          }),
        ]}
        selectedVersionId="version-uuid-1"
        onSelect={onSelect}
      />,
    );
    await fireEvent.press(getByLabelText('Select version'));
    await fireEvent.press(getByText(/More spice/));
    expect(onSelect).toHaveBeenCalledWith('version-uuid-2');
  });

  test('closes modal on request close', async () => {
    const {getByLabelText, getByText, queryByText, container} =
      await renderWithProviders(
        <VersionPicker
          versions={[
            makeRecipeVersionSummary(),
            makeRecipeVersionSummary({
              id: 'version-uuid-2',
              versionNumber: 2,
              derivedRole: 'draft',
            }),
          ]}
          selectedVersionId="version-uuid-1"
          onSelect={jest.fn()}
        />,
      );
    await fireEvent.press(getByLabelText('Select version'));
    expect(getByText('Select version')).toBeTruthy();
    const modal = container.queryAll(node => node.type === 'Modal')[0];
    await fireEvent(modal, 'requestClose');
    expect(queryByText('Select version')).toBeNull();
  });

  test('closes modal from backdrop', async () => {
    const {getByLabelText, getByTestId, queryByTestId} =
      await renderWithProviders(
        <VersionPicker
          versions={[
            makeRecipeVersionSummary(),
            makeRecipeVersionSummary({
              id: 'version-uuid-2',
              versionNumber: 2,
              derivedRole: 'draft',
            }),
          ]}
          selectedVersionId="version-uuid-1"
          onSelect={jest.fn()}
        />,
      );
    await fireEvent.press(getByLabelText('Select version'));
    await fireEvent(getByTestId('version-picker-sheet'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(getByTestId('version-picker-sheet')).toBeTruthy();
    await fireEvent.press(getByTestId('version-picker-backdrop'));
    expect(queryByTestId('version-picker-sheet')).toBeNull();
  });

  test('falls back to first sorted version when selection is missing', async () => {
    const {getByText} = await renderWithProviders(
      <VersionPicker
        versions={[
          makeRecipeVersionSummary({versionNumber: 1}),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'draft',
          }),
        ]}
        selectedVersionId="missing-id"
        onSelect={jest.fn()}
      />,
    );
    expect(getByText(/v2/)).toBeTruthy();
  });

  test('truncates long change summaries in the modal', async () => {
    const longSummary = 'B'.repeat(60);
    const {getByLabelText, getByText} = await renderWithProviders(
      <VersionPicker
        versions={[
          makeRecipeVersionSummary(),
          makeRecipeVersionSummary({
            id: 'version-uuid-2',
            versionNumber: 2,
            derivedRole: 'draft',
            changeSummary: longSummary,
          }),
        ]}
        selectedVersionId="version-uuid-1"
        onSelect={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Select version'));
    expect(getByText(/…/)).toBeTruthy();
  });
});
