import {
  applyThemeTokens,
  formatDim,
  MARK_SIZE,
  type MarkOptions,
  type ThemeColors,
  type VariantConfig,
  WORDMARK_HEIGHT,
  WORDMARK_WIDTH,
} from './config.ts';

const removeElementById = (svg: string, id: string): string => {
  const selfClosing = new RegExp(
    `<[a-zA-Z][\\w:-]*[^>]*\\bid="${id}"[^>]*/>`,
    'gu',
  );
  const withChildren = new RegExp(
    `<([a-zA-Z][\\w:-]*)[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</\\1>`,
    'gu',
  );
  return svg.replaceAll(selfClosing, '').replaceAll(withChildren, '');
};

const unwrapStyleDisplayNone = (svg: string, id: string): string =>
  svg.replaceAll(
    new RegExp(`(<[^>]*\\bid="${id}"[^>]*?)\\s*style="display:none"`, 'gu'),
    '$1',
  );

export const stripChalkFilter = (svg: string): string =>
  svg
    .replaceAll(/\s*filter="url\(#chalk\)"/gu, '')
    .replaceAll(/<filter id="chalk">[\s\S]*?<\/filter>\s*/gu, '');

export const buildMarkSvg = (
  masterMark: string,
  options: MarkOptions,
  theme: ThemeColors,
): string => {
  let svg = applyThemeTokens(masterMark, theme);

  if (options.bg === 'rounded') {
    svg = removeElementById(svg, 'bgCircle');
  } else {
    svg = removeElementById(svg, 'bgRounded');
    svg = unwrapStyleDisplayNone(svg, 'bgCircle');
    svg = svg.replaceAll('url(#roundClip)', 'url(#circleClip)');
  }

  if (!options.showGrid) {
    svg = removeElementById(svg, 'gridLines');
  }

  if (options.chalk === false) {
    svg = stripChalkFilter(svg);
  }

  return svg;
};

export const buildWordmarkSvg = (
  masterWordmark: string,
  theme: ThemeColors,
): string => applyThemeTokens(masterWordmark, theme);

export const extractSvgInner = (svg: string): string => {
  const match = /<svg[^>]*>([\s\S]*)<\/svg>/iu.exec(svg);
  if (!match?.[1]) {
    throw new Error('Invalid SVG: missing inner content');
  }
  return match[1].trim();
};

const buildHorizontalLockup = (
  markInner: string,
  wordmarkInner: string,
  gap: number,
): string => {
  const width = MARK_SIZE + gap + WORDMARK_WIDTH;
  const wordmarkY = (MARK_SIZE - WORDMARK_HEIGHT) / 2;
  const wordmarkX = MARK_SIZE + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatDim(width)} ${MARK_SIZE}">
  <g transform="translate(0 0)">${markInner}</g>
  <g transform="translate(${wordmarkX} ${wordmarkY})">${wordmarkInner}</g>
</svg>`;
};

const buildStackedLockup = (
  markInner: string,
  wordmarkInner: string,
  gap: number,
): string => {
  const height = MARK_SIZE + gap + WORDMARK_HEIGHT;
  const markX = (WORDMARK_WIDTH - MARK_SIZE) / 2;
  const wordmarkY = MARK_SIZE + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${formatDim(WORDMARK_WIDTH)} ${formatDim(height)}">
  <g transform="translate(${formatDim(markX)} 0)">${markInner}</g>
  <g transform="translate(0 ${wordmarkY})">${wordmarkInner}</g>
</svg>`;
};

export const buildCombinedSvg = (
  masterMark: string,
  masterWordmark: string,
  options: {layout: 'horizontal' | 'stacked'; mark: MarkOptions; gap: number},
  theme: ThemeColors,
): string => {
  const markInner = extractSvgInner(
    buildMarkSvg(masterMark, options.mark, theme),
  );
  const wordmarkInner = extractSvgInner(
    buildWordmarkSvg(masterWordmark, theme),
  );

  if (options.layout === 'horizontal') {
    return buildHorizontalLockup(markInner, wordmarkInner, options.gap);
  }

  return buildStackedLockup(markInner, wordmarkInner, options.gap);
};

export const buildVariantSvg = (
  variant: VariantConfig,
  theme: ThemeColors,
  masters: {mark: string; wordmark: string},
): string => {
  if (variant.type === 'mark') {
    return buildMarkSvg(masters.mark, variant, theme);
  }
  if (variant.type === 'wordmark') {
    return buildWordmarkSvg(masters.wordmark, theme);
  }
  return buildCombinedSvg(masters.mark, masters.wordmark, variant, theme);
};
