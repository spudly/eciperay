import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {OverviewActions} from './OverviewActions';

jest.mock('../../lib/api');

const mockActivate = api.versions.activate as jest.Mock;
const mockPatchLifecycle = api.recipes.patchLifecycle as jest.Mock;
const mockCreateVersion = api.versions.create as jest.Mock;

describe('OverviewActions', () => {
  beforeEach(() => {
    mockPatchLifecycle.mockResolvedValue(makeRecipeDetail());
    mockCreateVersion.mockResolvedValue(
      makeRecipeVersionSummary({id: 'version-draft-1'}),
    );
  });

  test('activates candidate versions', async () => {
    mockActivate.mockResolvedValueOnce(makeRecipeDetail());
    const onActionMessage = jest.fn();
    const {getByText} = renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail()}
        versions={[
          makeRecipeVersionSummary({
            id: 'v2',
            derivedRole: 'candidate',
            changeSummary: 'More spice',
          }),
        ]}
        onActionMessage={onActionMessage}
        onTweakAi={jest.fn()}
        onViewVersion={jest.fn()}
      />,
    );
    expect(getByText(/More spice/)).toBeTruthy();
    fireEvent.press(getByText('Activate'));
    await waitFor(() => {
      expect(onActionMessage).toHaveBeenCalledWith('Version activated');
    });
  });

  test('updates lifecycle status to perfected or abandoned', async () => {
    const {getByText} = renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail()}
        versions={[makeRecipeVersionSummary()]}
        onActionMessage={jest.fn()}
        onTweakAi={jest.fn()}
        onViewVersion={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Mark perfected'));
    await waitFor(() => {
      expect(mockPatchLifecycle).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'perfected',
      );
    });
    fireEvent.press(getByText('Abandon'));
    await waitFor(() => {
      expect(mockPatchLifecycle).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'abandoned',
      );
    });
  });

  test('creates manual tweak draft', async () => {
    const onViewVersion = jest.fn();
    const {getByText} = renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail()}
        versions={[makeRecipeVersionSummary()]}
        onActionMessage={jest.fn()}
        onTweakAi={jest.fn()}
        onViewVersion={onViewVersion}
      />,
    );
    fireEvent.press(getByText('Tweak manually'));
    await waitFor(() => {
      expect(onViewVersion).toHaveBeenCalledWith('version-draft-1');
    });
  });

  test('renders nothing for perfected recipes without candidates', () => {
    const {queryByText} = renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({lifecycleStatus: 'perfected'})}
        versions={[makeRecipeVersionSummary({derivedRole: 'active'})]}
        onActionMessage={jest.fn()}
        onTweakAi={jest.fn()}
        onViewVersion={jest.fn()}
      />,
    );
    expect(queryByText('Tweak manually')).toBeNull();
    expect(queryByText('Ready to activate')).toBeNull();
  });

  test('shows activation controls without tweak actions for perfected recipes', () => {
    const {getByText, queryByText} = renderWithProviders(
      <OverviewActions
        recipe={makeRecipeDetail({lifecycleStatus: 'perfected'})}
        versions={[
          makeRecipeVersionSummary({derivedRole: 'active'}),
          makeRecipeVersionSummary({id: 'v2', derivedRole: 'candidate'}),
        ]}
        onActionMessage={jest.fn()}
        onTweakAi={jest.fn()}
        onViewVersion={jest.fn()}
      />,
    );
    expect(getByText('Ready to activate')).toBeTruthy();
    expect(queryByText('Tweak manually')).toBeNull();
  });
});
