import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';

import {renderPublicRecipeHtml} from './renderPublicRecipe.js';

describe('renderPublicRecipeHtml', () => {
  test('renders the public recipe page to HTML in-process (SSR spike)', () => {
    const html = renderPublicRecipeHtml(makePublicRecipeResponse());

    expect(html).toContain('Test Recipe');
    expect(html).toContain('2 cups Flour');
    expect(html).toContain('Mix the ingredients together.');
  });
});
