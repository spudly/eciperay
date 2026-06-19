import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {makeRecipeVersionSummary} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {VersionPicker} from './VersionPicker';

describe('VersionPicker', () => {
  test('shows version number when only one version exists', () => {
    const {getByText} = renderWithProviders(
      <VersionPicker
        versions={[makeRecipeVersionSummary()]}
        selectedVersionId="version-uuid-1"
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Version 1')).toBeTruthy();
  });

  test('defaults to version 1 when versions list is empty', () => {
    const {getByText} = renderWithProviders(
      <VersionPicker
        versions={[]}
        selectedVersionId=""
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Version 1')).toBeTruthy();
  });

  test('opens version selector for multiple versions', () => {
    const onSelect = jest.fn();
    const {getByLabelText, getByText} = renderWithProviders(
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
    fireEvent.press(getByLabelText('Select version'));
    fireEvent.press(getByText(/More spice/));
    expect(onSelect).toHaveBeenCalledWith('version-uuid-2');
  });

  test('closes modal on request close', () => {
    const {getByLabelText, getByText, queryByText, UNSAFE_getByType} =
      renderWithProviders(
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
    fireEvent.press(getByLabelText('Select version'));
    expect(getByText('Select version')).toBeTruthy();
    const {Modal} = require('react-native');
    fireEvent(UNSAFE_getByType(Modal), 'requestClose');
    expect(queryByText('Select version')).toBeNull();
  });

  test('closes modal from backdrop', () => {
    const {getByLabelText, getByTestId, queryByTestId} = renderWithProviders(
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
    fireEvent.press(getByLabelText('Select version'));
    fireEvent(getByTestId('version-picker-sheet'), 'press', {
      stopPropagation: jest.fn(),
    });
    expect(getByTestId('version-picker-sheet')).toBeTruthy();
    fireEvent.press(getByTestId('version-picker-backdrop'));
    expect(queryByTestId('version-picker-sheet')).toBeNull();
  });

  test('falls back to first sorted version when selection is missing', () => {
    const {getByText} = renderWithProviders(
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
});
