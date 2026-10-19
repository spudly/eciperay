import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {
  AiSessionFlow,
  type AiSessionFlowApi,
  type AiSessionFlowConfig,
} from './AiSessionFlow';

const config: AiSessionFlowConfig = {
  title: 'Generate recipe',
  intro: 'Describe the recipe you want.',
  promptPlaceholder: 'e.g. orange chicken',
  startLabel: 'Start planning',
  startPendingLabel: 'Planning…',
  previewTitle: 'Preview',
  finalizeLabel: 'Save recipe',
  finalizePendingLabel: 'Saving…',
  phaseLabel: phase => `Phase: ${phase}`,
};

const session = {
  id: 'session-1',
  phase: 'planning' as const,
  messages: [
    {role: 'user' as const, content: 'orange chicken'},
    {role: 'assistant' as const, content: 'Plan for orange chicken'},
  ],
  proposedRecipe: null,
};

describe('AiSessionFlow', () => {
  const onEmptyCancel = jest.fn();
  const onFinalizeSuccess = jest.fn();
  const onCancelSuccess = jest.fn();

  const api: AiSessionFlowApi = {
    start: jest.fn(),
    sendMessage: jest.fn(),
    approvePlan: jest.fn(),
    finalize: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('starts a session from the prompt', async () => {
    (api.start as jest.Mock).mockResolvedValue({session});
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(
        <AiSessionFlow
          config={config}
          api={api}
          onEmptyCancel={onEmptyCancel}
          onFinalizeSuccess={onFinalizeSuccess}
          onCancelSuccess={onCancelSuccess}
        />,
      );
    await fireEvent.changeText(
      getByPlaceholderText('e.g. orange chicken'),
      'orange chicken like panda express',
    );
    await fireEvent.press(getByText('Start planning'));
    await waitFor(() => {
      expect(api.start).toHaveBeenCalledWith(
        'orange chicken like panda express',
      );
    });
    expect(await findByText('Plan for orange chicken')).toBeTruthy();
  });

  test('calls onEmptyCancel when cancel is pressed without a session', async () => {
    const {getByText} = await renderWithProviders(
      <AiSessionFlow
        config={config}
        api={api}
        onEmptyCancel={onEmptyCancel}
        onFinalizeSuccess={onFinalizeSuccess}
        onCancelSuccess={onCancelSuccess}
      />,
    );
    await fireEvent.press(getByText('Cancel'));
    expect(onEmptyCancel).toHaveBeenCalled();
  });
});
