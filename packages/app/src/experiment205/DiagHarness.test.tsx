import {renderWithProviders} from '../__tests__/testUtils';

import {DiagHarness} from './DiagHarness';

/**
 * Experiment smoke test (#205 diagnosis): the harness must mount the real
 * RecipesListView and expose its fixture rows in the tree, so the emulator
 * capture workflow screenshots the intended screen.
 */
describe('DiagHarness (#205 experiment)', () => {
  it('renders the fixture recipe rows', async () => {
    const {getByText} = await renderWithProviders(<DiagHarness />);
    expect(getByText('Chili')).toBeTruthy();
    expect(getByText('Smashed Cucumber Salad')).toBeTruthy();
  });
});
