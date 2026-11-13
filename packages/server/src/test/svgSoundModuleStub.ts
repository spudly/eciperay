/**
 * Node stub for react-native-svg's fabric/NativeSvgSoundModule, mirroring the
 * web build's stub (packages/web/svgSoundModuleStub.ts): the module is
 * native-only and calls TurboModuleRegistry at import time, which
 * react-native-web does not export. It is only loaded lazily for a touch-sound
 * feature no DS component uses, so the SSR module graph maps it to this inert
 * stub (see jest.config.cjs).
 */
export default null;
