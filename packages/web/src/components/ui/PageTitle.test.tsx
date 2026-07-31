import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';

import {PageTitle} from './PageTitle.js';

describe('PageTitle', () => {
  test('renders page title text', () => {
    render(<PageTitle>Hello</PageTitle>);

    expect(screen.getByRole('heading', {name: 'Hello'})).toBeInTheDocument();
  });
});
