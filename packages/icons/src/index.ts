/**
 * Feather glyph names shared by web (`react-icons/fi`) and app
 * (`react-native-vector-icons/Feather`).
 */
export const featherIconNames = [
  'home',
  'book-open',
  'users',
  'plus',
  'tag',
  'user',
  'coffee',
  'alert-triangle',
  'message-circle',
] as const;

export type FeatherIconName = (typeof featherIconNames)[number];

export const tabIcons = {
  Home: 'home',
  Recipes: 'book-open',
  Meals: 'coffee',
  Add: 'plus',
  Profile: 'user',
  Feedback: 'message-circle',
} as const satisfies Record<string, FeatherIconName>;
