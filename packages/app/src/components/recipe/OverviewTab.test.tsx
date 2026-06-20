import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeRecipeDetail,
  makeRecipeVersionSummary,
} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {printRecipe} from '../../lib/printRecipe';
import {shareRecipe} from '../../lib/shareRecipe';
import {api} from '../../lib/api';

import {OverviewTab} from './OverviewTab';

jest.mock('../../lib/api');
jest.mock('../../lib/printRecipe', () => ({
  printRecipe: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../lib/shareRecipe', () => ({
  shareRecipe: jest.fn().mockResolvedValue(null),
}));

const mockPrint = printRecipe as jest.Mock;
const mockShare = shareRecipe as jest.Mock;
const mockPatchLifecycle = api.recipes.patchLifecycle as jest.Mock;
const mockActivate = api.versions.activate as jest.Mock;
const mockCreateVersion = api.versions.create as jest.Mock;
const onStartCooking = jest.fn();
const onDelete = jest.fn();
const onTweakAi = jest.fn();
const onViewVersion = jest.fn();
const onEditRecipe = jest.fn();
const onEditVersion = jest.fn();

const defaultProps = () => ({
  recipe: makeRecipeDetail({title: 'Test Cake', description: 'Yummy cake'}),
  activeVersionId: makeRecipeDetail().versionId,
  servings: 4,
  versions: [makeRecipeVersionSummary()],
  onStartCooking,
  onDelete,
  onTweakAi,
  onViewVersion,
  onEditRecipe,
  onEditVersion,
});

describe('OverviewTab', () => {
  beforeEach(() => {
    mockPatchLifecycle.mockResolvedValue(makeRecipeDetail());
    mockActivate.mockResolvedValue(makeRecipeDetail());
    mockCreateVersion.mockResolvedValue(
      makeRecipeVersionSummary({id: 'version-draft-1'}),
    );
  });

  test('renders recipe title and description', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    expect(getByText('Test Cake')).toBeTruthy();
    expect(getByText('Yummy cake')).toBeTruthy();
  });

  test('calls onStartCooking when Start Cooking button pressed', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('Start Cooking'));
    expect(onStartCooking).toHaveBeenCalled();
  });

  test('calls printRecipe when print button pressed', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('🖨'));
    expect(mockPrint).toHaveBeenCalled();
  });

  test('calls shareRecipe when share button pressed', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('↗'));
    expect(mockShare).toHaveBeenCalled();
  });

  test('calls onDelete and onTweakAi', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('Delete'));
    fireEvent.press(getByText('Tweak with AI'));
    expect(onDelete).toHaveBeenCalled();
    expect(onTweakAi).toHaveBeenCalled();
  });

  test('shows edit for content-locked active versions', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('Edit'));
    expect(onEditRecipe).toHaveBeenCalled();
  });

  test('shows edit draft for editable draft versions', () => {
    const {getByText} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        recipe={makeRecipeDetail({versionId: 'draft-1'})}
        versions={[
          makeRecipeVersionSummary({
            id: 'draft-1',
            derivedRole: 'draft',
            isEditable: true,
          }),
        ]}
      />,
    );
    fireEvent.press(getByText('Edit draft'));
    expect(onEditVersion).toHaveBeenCalledWith('draft-1');
  });

  test('creates manual tweak version and selects it', async () => {
    const {getByText, findByText} = renderWithProviders(
      <OverviewTab {...defaultProps()} />,
    );
    fireEvent.press(getByText('Tweak manually'));
    expect(await findByText('Tweak manually')).toBeTruthy();
    await waitFor(() => {
      expect(mockCreateVersion).toHaveBeenCalled();
      expect(onViewVersion).toHaveBeenCalledWith('version-draft-1');
    });
  });

  test('renders image when imageUrl is provided', () => {
    const recipeWithImage = makeRecipeDetail({
      imageUrl: 'https://example.com/img.jpg',
    });
    const {toJSON} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        recipe={recipeWithImage}
      />,
    );
    expect(JSON.stringify(toJSON())).toContain('example.com/img.jpg');
  });

  test('renders without optional fields', () => {
    const minimal = makeRecipeDetail({
      imageUrl: null,
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [],
    });
    const {getByText, queryByText} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        recipe={minimal}
      />,
    );
    expect(getByText('Test Recipe')).toBeTruthy();
    expect(queryByText(/m$/)).toBeNull();
  });

  test('renders tags', () => {
    const recipeWithTag = makeRecipeDetail({
      tags: [
        {
          id: 't1',
          name: 'Dinner',
          color: '#6366f1',
          userId: null,
          isPreset: true,
        },
      ],
    });
    const {getByText} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        recipe={recipeWithTag}
      />,
    );
    expect(getByText('Dinner')).toBeTruthy();
  });

  test('shows and clears action message after activation', async () => {
    jest.useFakeTimers();
    mockActivate.mockResolvedValueOnce(makeRecipeDetail());
    const {getByText, findByText, queryByText} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        versions={[
          makeRecipeVersionSummary({id: 'v2', derivedRole: 'candidate'}),
        ]}
      />,
    );
    fireEvent.press(getByText('Activate'));
    expect(await findByText('Version activated')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    await waitFor(() => {
      expect(queryByText('Version activated')).toBeNull();
    });
    jest.useRealTimers();
  });

  test('hides edit draft for active versions', () => {
    const {queryByText} = renderWithProviders(
      <OverviewTab
        {...defaultProps()}
        recipe={makeRecipeDetail({lifecycleStatus: 'perfected'})}
      />,
    );
    expect(queryByText('Edit draft')).toBeNull();
  });
});
