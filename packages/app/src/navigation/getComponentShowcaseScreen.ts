import type {ComponentType} from 'react';

export const getComponentShowcaseScreen = (): ComponentType | null => {
  if (!__DEV__) {
    return null;
  }

  const {ComponentShowcaseScreen} =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only require
    require('../screens/ComponentShowcaseScreen') as {
      ComponentShowcaseScreen: ComponentType;
    };

  return ComponentShowcaseScreen;
};
