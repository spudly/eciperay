import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';

import {OverviewTab} from './OverviewTab.js';

vi.mock('../../lib/printRecipe.js', () => ({printRecipe: vi.fn()}));
vi.mock('../../lib/shareRecipe.js', () => ({shareRecipe: vi.fn()}));

describe('OverviewTab', () => {
  test('renders recipe details and actions', async () => {
    const recipe = makeRecipeDetail({imageUrl: 'https://example.com/img.jpg'});
    render(
      <MemoryRouter>
        <OverviewTab recipe={recipe} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('A test recipe')).toBeInTheDocument();
    expect(screen.getByText('Start Cooking')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    await userEvent.click(screen.getByText('🖨'));
    await userEvent.click(screen.getByText('↗'));
  });

  test('renders without optional fields', () => {
    const recipe = makeRecipeDetail({
      imageUrl: null,
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [],
    });
    render(
      <MemoryRouter>
        <OverviewTab recipe={recipe} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.queryByText('A test recipe')).not.toBeInTheDocument();
  });
});
