import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, test, vi} from 'vitest';

import {ComponentShowcaseView} from './ComponentShowcaseView.js';

vi.mock('./ShowcaseDemo.js', () => ({
  ShowcaseDemo: ({id}: {id: string}) => (
    <div data-testid="showcase-demo">{id}</div>
  ),
}));

describe('ComponentShowcaseView', () => {
  test('renders the showcase picker and first demo slot', () => {
    render(
      <MemoryRouter>
        <ComponentShowcaseView />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {name: 'Component Showcase'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {name: /component/i}),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Filter components'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('showcase-demo')).toBeInTheDocument();
  });
});
