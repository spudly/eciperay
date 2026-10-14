import {render, screen} from '@testing-library/react';
import {describe, expect, test} from 'vitest';

import {SectionCard} from './SectionCard.js';

describe('SectionCard', () => {
  test('renders title and children', () => {
    render(
      <SectionCard title="Preferences">
        <p>Body</p>
      </SectionCard>,
    );

    expect(screen.getByRole('heading', {name: 'Preferences'})).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
