/**
 * Default swatch palette for tag colors. The design system TagsPage renders the
 * design system ColorPickerField, which takes a fixed list of colors (the prop
 * API has no free-form palette), so the host passes this palette as the page's
 * `colorOptions`. These are data values (the colors a tag can take), not
 * styling. The values mirror the app package's TAG_COLOR_OPTIONS so web and
 * native offer the same swatches; previously web used a native free-form color
 * input instead (removed with the TagsView adoption in B7, design-system#130).
 */
export const TAG_COLOR_OPTIONS = [
  '#6366f1',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#6b7280',
];
