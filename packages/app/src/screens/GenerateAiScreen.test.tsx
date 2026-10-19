import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {GenerateAiScreen} from './GenerateAiScreen';

jest.mock('../lib/api');

const mockStart = api.createAi.start as jest.Mock;
const mockSendMessage = api.createAi.sendMessage as jest.Mock;
const mockApprovePlan = api.createAi.approvePlan as jest.Mock;
const mockCreateRecipe = api.createAi.createRecipe as jest.Mock;
const mockCancel = api.createAi.cancel as jest.Mock;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'GenerateAi'>(
  'GenerateAi',
  undefined,
  {goBack: mockGoBack, navigate: mockNavigate},
);

const session = {
  id: 'session-1',
  phase: 'planning' as const,
  messages: [
    {role: 'user' as const, content: 'cookies'},
    {role: 'assistant' as const, content: 'Plan for cookies'},
  ],
  approvedPlan: null,
  proposedRecipe: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('GenerateAiScreen', () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockSendMessage.mockReset();
    mockApprovePlan.mockReset();
    mockCreateRecipe.mockReset();
    mockCancel.mockReset();
    mockGoBack.mockReset();
    mockNavigate.mockReset();
  });

  test('does not start when prompt is empty', async () => {
    const {getByText} = await renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Start planning'));
    expect(mockStart).not.toHaveBeenCalled();
  });

  test('starts session and saves recipe after preview', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockApprovePlan.mockResolvedValue({
      session: {
        ...session,
        phase: 'preview_ready',
        proposedRecipe: {
          title: 'Cookies',
          servings: 12,
          ingredients: [],
          instructions: [],
          tagIds: [],
        },
      },
      changeSummary: 'AI recipe',
      preview: {
        title: 'Cookies',
        servings: 12,
        ingredients: [],
        instructions: [],
      },
    });
    mockCreateRecipe.mockResolvedValue({
      recipeId: 'recipe-ai-1',
      versionId: 'version-uuid-1',
    });
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    await fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith(
        'simple chocolate chip cookies for 12',
      );
      expect(
        getByText(
          /Review the plan and refine it, or approve to build a preview/,
        ),
      ).toBeTruthy();
    });
    await fireEvent.press(getByText('Approve plan'));
    await waitFor(() => {
      expect(
        getByText(
          /Preview ready — save the recipe or go back to refine the plan/,
        ),
      ).toBeTruthy();
      expect(getByText('Save recipe')).toBeTruthy();
    });
    await fireEvent.press(getByText('Save recipe'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'recipe-ai-1',
      });
    });
  });

  test('refines plan and cancels active session', async () => {
    mockStart.mockResolvedValue({session, plan: 'Plan for cookies'});
    mockSendMessage.mockResolvedValue({
      session: {
        ...session,
        messages: [
          ...session.messages,
          {role: 'user', content: 'add vanilla'},
          {role: 'assistant', content: 'Add vanilla extract'},
        ],
      },
      reply: 'Add vanilla extract',
    });
    mockCancel.mockResolvedValue({session: {...session, phase: 'cancelled'}});
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<GenerateAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(getByPlaceholderText('Ask for changes to the plan…')).toBeTruthy();
    });
    await fireEvent.changeText(
      getByPlaceholderText('Ask for changes to the plan…'),
      'add vanilla',
    );
    await fireEvent.press(getByText('Refine plan'));
    expect(await findByText('Add vanilla extract')).toBeTruthy();
    await fireEvent.press(getByText('Cancel session'));
    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledWith('session-1');
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  test('cancels from empty state', async () => {
    const {getByText} = await renderWithProviders(
      <GenerateAiScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('shows default phase label for completed session', async () => {
    mockStart.mockResolvedValue({
      session: {...session, phase: 'completed'},
      plan: '',
    });
    const {getByPlaceholderText, getByText, queryByText} =
      await renderWithProviders(<GenerateAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(queryByText('Cancel session')).toBeNull();
    });
  });

  test('shows error when start fails', async () => {
    mockStart.mockRejectedValue(new Error('Planning failed'));
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<GenerateAiScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText(/quick weeknight vegetarian pasta/i),
      'simple chocolate chip cookies for 12',
    );
    await fireEvent.press(getByText('Start planning'));
    expect(await findByText('Planning failed')).toBeTruthy();
  });
});
