import React from 'react';
import {fireEvent, waitFor, act} from '@testing-library/react-native';

import {makeRecipeVersionSummary} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {TweakAiScreen} from './TweakAiScreen';

jest.mock('../lib/api', () => ({
  api: {
    tweakAi: {
      start: jest.fn(),
      sendMessage: jest.fn(),
      approvePlan: jest.fn(),
      createVersion: jest.fn(),
      cancel: jest.fn(),
    },
  },
}));

const mockStart = api.tweakAi.start as jest.Mock;
const mockSendMessage = api.tweakAi.sendMessage as jest.Mock;
const mockApprove = api.tweakAi.approvePlan as jest.Mock;
const mockCreateVersion = api.tweakAi.createVersion as jest.Mock;
const mockCancel = api.tweakAi.cancel as jest.Mock;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'TweakAi'>(
  'TweakAi',
  {recipeId: 'recipe-uuid-1'},
  {navigate: mockNavigate, goBack: mockGoBack},
);

const previewRecipe = {
  title: 'Spicy Recipe',
  description: 'Hot and tasty',
  servings: 4,
  prepTimeMin: 10,
  cookTimeMin: 20,
  ingredients: [
    {
      sortOrder: 0,
      name: 'chili',
      quantity: 2,
      unit: 'tsp',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Add chili'}],
  tagIds: [],
  imageUrl: null,
  sourceUrl: null,
};

const session = {
  id: 'session-1',
  recipeId: 'recipe-uuid-1',
  phase: 'planning' as const,
  messages: [
    {role: 'user' as const, content: 'make it spicier'},
    {role: 'assistant' as const, content: 'Add more chili'},
  ],
  approvedPlan: null,
  proposedRecipe: null,
  parentVersionId: 'version-uuid-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('TweakAiScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockResolvedValue({session, plan: 'Add more chili'});
    mockApprove.mockResolvedValue({
      session: {
        ...session,
        phase: 'preview_ready',
        approvedPlan: 'Add more chili',
        proposedRecipe: previewRecipe,
      },
      changeSummary: 'AI tweak',
      preview: previewRecipe,
    });
    mockCreateVersion.mockResolvedValue({
      versionId: 'version-draft-1',
      version: makeRecipeVersionSummary({id: 'version-draft-1'}),
      session: {...session, phase: 'completed'},
    });
  });

  test('runs conversational flow and navigates to edit version', async () => {
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await act(async () => {
      await fireEvent.press(getByText('Start planning'));
    });
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        'recipe-uuid-1',
        'make it spicier',
      );
      expect(getByText('Approve plan')).toBeTruthy();
    });
    await act(async () => {
      await fireEvent.press(getByText('Approve plan'));
    });
    await waitFor(() => {
      expect(getByText('1. Add chili')).toBeTruthy();
      expect(getByText('Save as draft')).toBeTruthy();
    });
    await act(async () => {
      await fireEvent.press(getByText('Save as draft'));
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('EditVersion', {
        recipeId: 'recipe-uuid-1',
        versionId: 'version-draft-1',
      });
    });
  });

  test('shows error on failure', async () => {
    mockStart.mockRejectedValue(new Error('AI planning failed'));
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<TweakAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    expect(await findByText('AI planning failed')).toBeTruthy();
  });

  test('shows generic error for non-Error failures', async () => {
    mockStart.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<TweakAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    expect(await findByText('An unexpected error occurred')).toBeTruthy();
  });

  test('refines the plan and cancels the session', async () => {
    mockSendMessage.mockResolvedValue({
      session: {
        ...session,
        messages: [
          ...session.messages,
          {role: 'user', content: 'less salt'},
          {role: 'assistant', content: 'Use less salt'},
        ],
      },
      reply: 'Use less salt',
    });
    mockCancel.mockResolvedValue({session: {...session, phase: 'cancelled'}});
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(getByText('Refine plan')).toBeTruthy();
    });
    await fireEvent.changeText(
      getByPlaceholderText('Ask for changes to the plan…'),
      'less salt',
    );
    await fireEvent.press(getByText('Refine plan'));
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalled();
      expect(getByText('Use less salt')).toBeTruthy();
    });
    await fireEvent.press(getByText('Cancel session'));
    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  test('shows errors for later session steps', async () => {
    mockApprove.mockRejectedValueOnce('nope');
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(getByText('Approve plan')).toBeTruthy();
    });
    await act(async () => {
      await fireEvent.press(getByText('Approve plan'));
    });
    await waitFor(() => {
      expect(getByText('An unexpected error occurred')).toBeTruthy();
    });

    mockApprove.mockResolvedValueOnce({
      session: {
        ...session,
        phase: 'preview_ready',
        proposedRecipe: previewRecipe,
      },
      changeSummary: 'AI tweak',
      preview: previewRecipe,
    });
    mockCreateVersion.mockRejectedValueOnce('nope');
    await act(async () => {
      await fireEvent.press(getByText('Approve plan'));
    });
    await waitFor(() => {
      expect(getByText('Save as draft')).toBeTruthy();
    });
    await act(async () => {
      await fireEvent.press(getByText('Save as draft'));
    });
    await waitFor(() => {
      expect(getByText('An unexpected error occurred')).toBeTruthy();
    });
  });

  test('shows generic message error', async () => {
    mockSendMessage.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<TweakAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(getByText('Refine plan')).toBeTruthy();
    });
    await fireEvent.changeText(
      getByPlaceholderText('Ask for changes to the plan…'),
      'less salt',
    );
    await fireEvent.press(getByText('Refine plan'));
    expect(await findByText('An unexpected error occurred')).toBeTruthy();
  });

  test('does not show preview when proposed recipe is invalid', async () => {
    mockApprove.mockResolvedValueOnce({
      session: {...session, phase: 'preview_ready', proposedRecipe: {}},
      changeSummary: 'AI tweak',
      preview: {
        title: '',
        servings: 0,
        ingredients: [],
        instructions: [],
        tagIds: [],
      },
    });
    const {getByPlaceholderText, getByText, queryByText} =
      await renderWithProviders(<TweakAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await act(async () => {
      await fireEvent.press(getByText('Start planning'));
    });
    await act(async () => {
      await fireEvent.press(getByText('Approve plan'));
    });
    await waitFor(() => {
      expect(queryByText('Draft preview')).toBeNull();
    });
  });

  test('renders empty phase label for completed sessions', async () => {
    mockStart.mockResolvedValue({
      session: {...session, phase: 'completed'},
      plan: 'done',
    });
    const {getByPlaceholderText, getByText, queryByText} =
      await renderWithProviders(<TweakAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/make it vegetarian/i),
      'make it spicier',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(queryByText('Review the plan and refine it')).toBeNull();
    });
  });

  test('cancels and goes back', async () => {
    const {getByText} = await renderWithProviders(
      <TweakAiScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
