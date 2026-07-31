import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {SignInView} from './SignInView';

describe('SignInView', () => {
  test('renders sign-in title and button', () => {
    render(
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
