import {createTamaguiConfig, eciperayTheme} from '@spudly/ui';

/**
 * The web app's Tamagui config — created by the app itself via the design
 * system's factory, NOT imported prebuilt from @spudly/ui.
 *
 * Why: Tamagui v3 resolves every theme/token against a single global config —
 * the one most recently passed to `createTamagui()` — and `TamaguiProvider`'s
 * `config` prop does not install its config for style resolution (it only seeds
 * the default theme name and the animation driver). @spudly/ui creates several
 * configs at module scope (base, Eciperay, Memorize, Storybook), so the last
 * one evaluated wins globally: importing the prebuilt `eciperayTamaguiConfig`
 * left another brand's config in charge and the app rendered the wrong theme
 * (see spudly/eciperay#149).
 *
 * This module evaluates after the @spudly/ui module, so the config created here
 * is the last `createTamagui()` call and the one the runtime actually resolves
 * against. Keep it that way: exactly one config creation per app entry, in
 * app-owned code.
 */
export const webTamaguiConfig = createTamaguiConfig(eciperayTheme);
