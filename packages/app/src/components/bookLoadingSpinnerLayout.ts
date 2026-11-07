import {eciperayTheme} from '@spudly/ui';

export const BOOK_LOADER_SCALE = {sm: 0.45, md: 0.65, lg: 0.85} as const;

export const BASE_WIDTH = 200;
export const BASE_HEIGHT = 140;

export type LineLayout = {left: number; top: number};

export type DimensionStyle = {
  width: number;
  height: number;
  borderRadius?: number;
  padding?: number;
  left?: number;
  top?: number;
};

export const leftPageLines = (scale: number): LineLayout[] => [
  {left: 15 * scale, top: 30 * scale},
  {left: 15 * scale, top: 60 * scale},
  {left: 15 * scale, top: 90 * scale},
  {left: 105 * scale, top: 30 * scale},
  {left: 105 * scale, top: 60 * scale},
  {left: 105 * scale, top: 90 * scale},
];

export const flippingPageLines = (
  pageWidth: number,
  scale: number,
): LineLayout[] => {
  const lineWidth = 60 * scale;
  const centeredLeft = (pageWidth - lineWidth) / 2;

  return [
    {left: centeredLeft, top: 30 * scale},
    {left: centeredLeft, top: 60 * scale},
    {left: centeredLeft, top: 90 * scale},
  ];
};

/**
 * Static style fragments for the spinner (plain objects — no StyleSheet; every
 * visual value comes from @spudly/ui tokens, the dimensions are computed from
 * the size scale in the layout helpers above).
 */
export const bookLoadingSpinnerStyles = {
  flipPage: {backfaceVisibility: 'hidden' as const},
  line: {position: 'absolute' as const},
  innerPage: {
    position: 'relative' as const,
    flex: 1,
    overflow: 'hidden' as const,
    backgroundColor: eciperayTheme.semantic.surface,
  },
  flipAnchor: {position: 'absolute' as const, right: 0, top: 0},
  pageSurface: {backgroundColor: eciperayTheme.semantic.surface},
};
