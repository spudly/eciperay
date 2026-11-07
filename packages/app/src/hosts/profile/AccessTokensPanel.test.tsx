import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {AccessTokensPanel} from './AccessTokensPanel';

const baseProps = {
  tokens: [
    {
      id: 'token-1',
      name: 'Claude Desktop',
      prefix: 'ecip_ab12',
      metaLabel: 'Created Jan 2, 2026',
    },
  ],
  tokenName: '',
  onTokenNameChange: jest.fn(),
  onCreate: jest.fn(),
  createdSecret: null,
  onDismissSecret: jest.fn(),
  onRevoke: jest.fn(),
};

describe('AccessTokensPanel', () => {
  test('renders token rows and reports a revoke press', async () => {
    const onRevoke = jest.fn();
    const {getByText} = await renderWithProviders(
      <AccessTokensPanel
        {...baseProps}
        onRevoke={onRevoke}
      />,
    );
    expect(getByText('Claude Desktop')).toBeTruthy();
    expect(getByText('Created Jan 2, 2026')).toBeTruthy();

    await fireEvent.press(getByText('Revoke'));
    expect(onRevoke).toHaveBeenCalledWith('token-1');
  });

  test('creates with the entered name and shows the created secret', async () => {
    const onCreate = jest.fn();
    const onDismissSecret = jest.fn();
    const {getByText, getByPlaceholderText, rerender} =
      await renderWithProviders(
        <AccessTokensPanel
          {...baseProps}
          tokenName="Claude Desktop"
          onCreate={onCreate}
          onDismissSecret={onDismissSecret}
        />,
      );
    expect(getByPlaceholderText('e.g. Claude Desktop')).toBeTruthy();

    await fireEvent.press(getByText('Create token'));
    expect(onCreate).toHaveBeenCalledTimes(1);

    await rerender(
      <AccessTokensPanel
        {...baseProps}
        tokenName="Claude Desktop"
        onCreate={onCreate}
        onDismissSecret={onDismissSecret}
        createdSecret="ecip_secret_value"
      />,
    );
    expect(getByText('ecip_secret_value')).toBeTruthy();

    await fireEvent.press(getByText('Done'));
    expect(onDismissSecret).toHaveBeenCalledTimes(1);
  });

  test('shows the plan notice instead of the create form', async () => {
    const {getByText, queryByText} = await renderWithProviders(
      <AccessTokensPanel
        {...baseProps}
        planNotice="Your plan cannot create tokens."
      />,
    );
    expect(getByText('Your plan cannot create tokens.')).toBeTruthy();
    expect(queryByText('Create token')).toBeNull();
  });
});
