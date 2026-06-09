import {render, screen} from '@testing-library/react';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';

import {InstructionsTab} from './InstructionsTab.js';

describe('InstructionsTab', () => {
  test('renders sorted instructions', () => {
    render(<InstructionsTab recipe={makeRecipeDetail()} />);
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
    expect(screen.getByText('Bake at 350°F')).toBeInTheDocument();
  });
});
