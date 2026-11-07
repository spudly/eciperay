import type {IconName} from '../components/Icon';

/**
 * Which icon each bottom tab shows. This mapping is app configuration — the
 * glyphs are rendered host-side by the app's Icon component (Feather glyphs via
 * react-native-svg, a temporary measure pending the design-system shell work in
 * follow-up issue #451), but a mapping from app concepts like tabs to icons was
 * never the design system's to ship — so it lives here, alongside the tab
 * navigator (moved out of the retired `@eciperay/icons` package in #246).
 */
export const tabIcons = {
  Home: 'home',
  Recipes: 'book-open',
  Meals: 'coffee',
  Add: 'plus',
  Profile: 'user',
  Feedback: 'message-circle',
} as const satisfies Record<string, IconName>;
