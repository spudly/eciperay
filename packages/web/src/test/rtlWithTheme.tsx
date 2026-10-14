/**
 * Test wrapper for @testing-library/react that provides the Tamagui theme.
 *
 * The ui primitives are now adapters over @spudly/ui (Tamagui) components,
 * which require a theme context. This module re-exports everything from the
 * real @testing-library/react but wraps `render` in a TamaguiProvider so
 * existing tests don't need to change.
 *
 * Wired via the `@testing-library/react` alias in vitest.config.ts.
 */
import {createRequire} from 'node:module';

import type {ReactElement, ReactNode} from 'react';
import {tamaguiConfig} from '@spudly/ui';
import {TamaguiProvider} from 'tamagui';

// Use Node resolution (bypasses the Vite alias) to get the real package.
/* eslint-disable import-x/no-commonjs -- intentional: bypass Vite alias to reach the real package */
const require = createRequire(import.meta.url);
const rtl = require('@testing-library/react') as typeof import('@testing-library/react');
/* eslint-enable import-x/no-commonjs -- re-enable after intentional require */

function ThemeWrapper({children}: {children: ReactNode}) {
  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme="light"
    >
      {children}
    </TamaguiProvider>
  );
}

type RenderOptions = Parameters<typeof rtl.render>[1];

export function render(ui: ReactElement, options?: RenderOptions) {
  const {wrapper: OriginalWrapper, ...rest} = options ?? {};
  const wrapper = OriginalWrapper
    ? ({children}: {children: ReactNode}) => (
        <ThemeWrapper>
          <OriginalWrapper>{children}</OriginalWrapper>
        </ThemeWrapper>
      )
    : ThemeWrapper;
  return rtl.render(ui, {...rest, wrapper});
}

// Re-export everything else from the real package.
export const {
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  within,
  getByRole,
  getByText,
  queryByRole,
  queryByText,
  findByRole,
  findByText,
  renderHook,
} = rtl;
