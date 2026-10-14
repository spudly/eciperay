export const BRAND_COLORS = new Set([
  '#0943ce',
  '#04152d',
  '#eef2f6',
  '#c2410c',
  '#292019',
  '#fffdf8',
  'none',
]);

export const MARK_SIZE = 256;
export const WORDMARK_WIDTH = 403.051;
export const WORDMARK_HEIGHT = 97;

export const formatDim = (value: number): string => {
  const fixed = value.toFixed(3);
  return fixed.replace(/\.0+$/u, '').replace(/(\.\d*?)0+$/u, '$1');
};

export const PNG_SIZES = [16, 32, 48, 180, 192, 512, 1024] as const;
export const MINIMAL_RASTER_SIZE_THRESHOLD = 48;

export type ThemeColors = {
  logoBg: string;
  logoInk: string;
  logoSpoonFill: string;
  logoSpoonStroke: string;
  wordmarkFill: string;
  wordmarkAccent: string;
};

export type ThemeOverrides = Partial<ThemeColors>;

export type ThemesConfig = {default: ThemeColors; dark: ThemeColors};

export type MarkOptions = {
  bg: 'rounded' | 'circle';
  showGrid: boolean;
  chalk?: boolean;
};

export type VariantConfig =
  | {
      output: string;
      type: 'mark';
      bg: 'rounded' | 'circle';
      showGrid: boolean;
      chalk?: boolean;
      theme?: ThemeOverrides;
    }
  | {output: string; type: 'wordmark'}
  | {
      output: string;
      type: 'combined';
      layout: 'horizontal' | 'stacked';
      mark: MarkOptions;
      gap: number;
    };

export type VariantsConfig = {variants: VariantConfig[]};

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;
const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const THEME_TOKEN_KEYS = new Set<string>([
  'logoBg',
  'logoInk',
  'logoSpoonFill',
  'logoSpoonStroke',
  'wordmarkFill',
  'wordmarkAccent',
]);

export const darkOutputPath = (output: string): string =>
  output.replace(/\.svg$/u, '-dark.svg');

export const normalizeColor = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'none') {
    return 'none';
  }
  if (!/^#[0-9a-f]{6}$/u.test(trimmed)) {
    throw new Error(`Invalid color value: ${value}`);
  }
  return trimmed;
};

export const validateThemeColors = (
  theme: ThemeColors,
  label: string,
): void => {
  for (const [key, value] of Object.entries(theme)) {
    const normalized = normalizeColor(value);
    if (!BRAND_COLORS.has(normalized)) {
      throw new Error(
        `Theme "${label}" key "${key}" uses disallowed color: ${value}`,
      );
    }
  }
};

export const mergeTheme = (
  base: ThemeColors,
  overrides?: ThemeOverrides,
): ThemeColors => {
  if (!overrides) {
    return base;
  }
  for (const [key, value] of Object.entries(overrides)) {
    const normalized = normalizeColor(value);
    if (!BRAND_COLORS.has(normalized)) {
      throw new Error(
        `Theme override "${key}" uses disallowed color: ${value}`,
      );
    }
  }
  return {...base, ...overrides};
};

export const validateSvgColors = (svg: string): void => {
  const matches = svg.match(HEX_PATTERN) ?? [];
  for (const hex of matches) {
    const normalized = hex.toLowerCase();
    if (!BRAND_COLORS.has(normalized)) {
      throw new Error(`SVG contains disallowed color: ${hex}`);
    }
  }
};

export const applyThemeTokens = (
  template: string,
  theme: ThemeColors,
): string => {
  const replaced = template.replaceAll(TOKEN_PATTERN, (_match, key: string) => {
    if (!THEME_TOKEN_KEYS.has(key)) {
      throw new Error(`Unknown theme token: ${key}`);
    }
    return normalizeColor(theme[key as keyof ThemeColors]);
  });
  validateSvgColors(replaced);
  return replaced;
};
