import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';
import {MemoryRouter} from 'react-router-dom';

import {SignInView} from './SignInView.js';

describe('SignInView', () => {
  test('renders sign-in title and button', () => {
    render(
      <MemoryRouter>
        <SignInView
          email=""
          password=""
          onEmailChange={() => {}}
          onPasswordChange={() => {}}
          loading={false}
          onSubmit={() => {}}
          onSignUpPress={() => {}}
          onForgotPasswordPress={() => {}}
          signUpTo="/signup"
          forgotPasswordTo="/forgot-password"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {name: 'Welcome back'}),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Sign In'})).toBeInTheDocument();
  });
});
