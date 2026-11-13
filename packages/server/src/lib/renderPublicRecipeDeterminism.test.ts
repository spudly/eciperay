import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';
import {renderStreamToHtml} from '../test/renderStreamToHtml.js';

import {renderPublicRecipeStreamDeterministic} from './renderPublicRecipe.js';

// This assertion lives in its own test file on purpose: Jest gives each
// test file a fresh module registry, and no other render of the fixture
// happens in this file before it, so the first deterministic render below
// starts from a genuinely cold Tamagui CSS registry. In a shared file the
// earlier renders would saturate the registry first and the cold case —
// the one the warm-up pass exists for — would never be exercised.
describe('renderPublicRecipeStreamDeterministic (cold registry)', () => {
  test('the first served render is byte-identical to the second', async () => {
    const first = await renderStreamToHtml(async options =>
      renderPublicRecipeStreamDeterministic(
        makePublicRecipeResponse(),
        options,
      ),
    );
    const second = await renderStreamToHtml(async options =>
      renderPublicRecipeStreamDeterministic(
        makePublicRecipeResponse(),
        options,
      ),
    );

    expect(first).toBe(second);
    expect(first).toContain('Test Recipe');
  });
});
