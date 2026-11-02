import type {IconName} from '../components/Icon';

/**
 * Which icon each bottom tab shows. This mapping is app configuration — the
 * design system ships the glyphs (`@spudly/ui/icons`) but never a mapping from
 * app concepts like tabs to icons — so it lives here, alongside the tab
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
