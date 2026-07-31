import {COMPONENT_SHOWCASE_CATALOG} from '@eciperay/client';
import {describe, expect, test} from 'vitest';

import {showcaseModuleLoaders} from './showcaseModuleLoaders.js';

describe('showcaseModuleLoaders', () => {
  test('loader keys match catalog ids', () => {
    const catalogIds = COMPONENT_SHOWCASE_CATALOG.map(entry => entry.id).sort();
    const loaderIds = Object.keys(showcaseModuleLoaders).sort();
    expect(loaderIds).toEqual(catalogIds);
  });
});
