/**
 * Default swatch palette for tag colors. The design system ColorPickerField
 * requires a fixed list of colors (the prop API has no palette), so these cover
 * the common tag colors; a value outside the palette simply shows no swatch
 * selected. These are data values (the colors a tag can take), not styling.
 * Previously exported from the ui/ColorPickerField adapter, which was removed
 * in B6 (design-system#129) once its only production importer turned out to be
 * this constant.
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
