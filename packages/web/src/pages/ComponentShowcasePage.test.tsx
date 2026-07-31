import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, test, vi} from 'vitest';

import {ComponentShowcasePage} from './ComponentShowcasePage.js';

describe('ComponentShowcasePage', () => {
  test('renders the showcase in development', () => {
    render(
      <MemoryRouter>
        <ComponentShowcasePage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {name: 'Component Showcase'}),
    ).toBeInTheDocument();
  });

  test('redirects away outside development', () => {
    vi.stubEnv('DEV', false);

    render(
      <MemoryRouter initialEntries={['/dev/components']}>
        <ComponentShowcasePage />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole('heading', {name: 'Component Showcase'}),
    ).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});
