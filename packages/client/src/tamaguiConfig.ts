import {createTamaguiConfig, eciperayTheme} from '@spudly/ui';

/**
 * The hosts' Tamagui config — created via the design system's factory, NOT
 * imported prebuilt from @spudly/ui. Single implementation in
 * @eciperay/client (#673); each host imports it from its entry so exactly
 * one config creation happens per app entry.
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
 * against. Keep it that way: exactly one config creation per app entry.
 */
export const eciperayTamaguiConfig = createTamaguiConfig(eciperayTheme);
