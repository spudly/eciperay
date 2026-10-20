import {getConfig} from 'tamagui';

import {appTamaguiConfig} from './tamaguiConfig';

describe('appTamaguiConfig', () => {
  it('installs itself as the global config with the Warm Harvest light theme', () => {
    // Tamagui resolves against the last createTamagui() call globally;
    // the app config module must be that call (regression #149).
    expect(getConfig()).toBe(appTamaguiConfig);

    const light = appTamaguiConfig.themes.light as unknown as Record<
      string,
      {val?: string} | undefined
    >;
    expect(light['primary']?.val).toBe('#c2410c');
    expect(light['background']?.val).toBe('#faf6f0');
  });
});
