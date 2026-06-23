/**
 * Feather glyph names shared by web (`react-icons/fi`) and app
 * (`@expo/vector-icons/Feather`).
 */
export const featherIconNames = [
  'home',
  'book-open',
  'users',
  'plus',
  'tag',
  'user',
  'alert-triangle',
] as const;

export type FeatherIconName = (typeof featherIconNames)[number];

export const tabIcons = {
  Home: 'home',
  Recipes: 'book-open',
  Add: 'plus',
  Profile: 'user',
} as const satisfies Record<string, FeatherIconName>;
