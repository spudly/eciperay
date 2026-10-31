/**
 * Web stub for react-native-svg's fabric/NativeSvgSoundModule.
 *
 * That module is native-only: it calls
 * `TurboModuleRegistry.getEnforcing('RNSVGSoundModule')` at import time, and
 * react-native-web (the web build's react-native alias) exports no
 * TurboModuleRegistry, so the bundler fails the whole web build on the missing
 * export. The module is only ever loaded lazily by SvgTouchableMixin for the
 * touch-sound feature, which no design system component uses (the icons render
 * static shapes). The web build therefore aliases it to this inert stub; the
 * native app uses the real module. (Same stub the design system's web Storybook
 * carries, adopted with the @spudly/ui 1.15 bump that brought react-native-svg
 * into the web graph.)
 */
export default null;
