import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {SignInView} from './SignInView';

describe('SignInView', () => {
  test('renders sign-in title and button', async () => {
    await renderWithProviders(
      <SignInView
        email=""
        password=""
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        loading={false}
        onSubmit={() => {}}
        onSignUpPress={() => {}}
        onForgotPasswordPress={() => {}}
      />,
    );

    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });
});
