import {getConfig} from 'tamagui';
import {describe, expect, it} from 'vitest';

import {webTamaguiConfig} from './tamaguiConfig.js';

describe('webTamaguiConfig', () => {
  it('installs itself as the global config with the Warm Harvest light theme', () => {
    // Tamagui resolves against the last createTamagui() call globally;
    // the app config module must be that call (regression #149).
    expect(getConfig()).toBe(webTamaguiConfig);

    const light = webTamaguiConfig.themes.light as unknown as Record<
      string,
      {val?: string} | undefined
    >;
    expect(light['primary']?.val).toBe('#c2410c');
    expect(light['background']?.val).toBe('#faf6f0');
  });
});
