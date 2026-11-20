import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {FamilySharingForm} from './FamilySharingForm';

const grant = {
  ownerUserId: 'user-uuid-1',
  recipientUserId: 'recipient-uuid-1',
  recipientEmail: 'sister@example.com',
  recipientDisplayName: 'Sister',
  createdAt: '2026-11-20T00:00:00.000Z',
};

describe('FamilySharingForm', () => {
  test('shows the empty state and reports email edits and add presses', async () => {
    const onEmailChange = jest.fn();
    const onAdd = jest.fn();
    const {getByText, getByPlaceholderText} = await renderWithProviders(
      <FamilySharingForm
        grants={[]}
        email=""
        onEmailChange={onEmailChange}
        onAdd={onAdd}
        onRemove={jest.fn()}
      />,
    );
    expect(
      getByText('You have not designated anyone for family sharing yet.'),
    ).toBeTruthy();
    await fireEvent.changeText(
      getByPlaceholderText('family@example.com'),
      'sister@example.com',
    );
    expect(onEmailChange).toHaveBeenCalledWith('sister@example.com');
  });

  test('lists grants and reports remove presses', async () => {
    const onRemove = jest.fn();
    const {getByText} = await renderWithProviders(
      <FamilySharingForm
        grants={[grant]}
        email=""
        onEmailChange={jest.fn()}
        onAdd={jest.fn()}
        onRemove={onRemove}
      />,
    );
    expect(getByText('Sister (sister@example.com)')).toBeTruthy();
    await fireEvent.press(getByText('Remove'));
    expect(onRemove).toHaveBeenCalledWith(grant);
  });

  test('shows an error alert', async () => {
    const {getByText} = await renderWithProviders(
      <FamilySharingForm
        grants={[]}
        email=""
        onEmailChange={jest.fn()}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
        error="No account found for that email address"
      />,
    );
    expect(
      getByText('No account found for that email address'),
    ).toBeTruthy();
  });
});
