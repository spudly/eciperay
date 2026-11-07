import type {ComponentType} from 'react';
import React from 'react';
import {Circle, Line, Path, Polyline, Rect, Svg} from 'react-native-svg';

/**
 * The icon names this app renders, owned by the app: which glyph a given app
 * concept uses is app configuration, so the name set and the name-to-component
 * mapping live here (moved out of the retired `@eciperay/icons` package in
 * #246).
 *
 * The glyphs themselves used to come from the design system's icons module, but
 * @spudly/ui 6.x exports pages only — there are no icon exports — so the glyphs
 * are now rendered host-side here with react-native-svg, mirroring the design
 * system's base renderer: the official Feather SVG element data
 * (feathericons/feather, MIT licensed), copied from the Feather SVG source, on
 * a 24x24 viewBox with Feather's stroke treatment (strokeWidth 2, round caps
 * and joins, no fill). This is a temporary measure pending the design-system
 * shell work (follow-up issue #451), which is expected to own the shell — and
 * its icons — again.
 */

/** One SVG child element of an icon, in Feather's own terms. */
type IconElement =
  | {kind: 'path'; d: string}
  | {kind: 'polyline'; points: string}
  | {kind: 'line'; x1: string; y1: string; x2: string; y2: string}
  | {kind: 'circle'; cx: string; cy: string; r: string}
  | {
      kind: 'rect';
      x: string;
      y: string;
      width: string;
      height: string;
      rx?: string;
      ry?: string;
    };

const renderElement = (element: IconElement, index: number) => {
  switch (element.kind) {
    case 'path':
      return (
        <Path
          key={index}
          d={element.d}
        />
      );
    case 'polyline':
      return (
        <Polyline
          key={index}
          points={element.points}
        />
      );
    case 'line':
      return (
        <Line
          key={index}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
        />
      );
    case 'circle':
      return (
        <Circle
          key={index}
          cx={element.cx}
          cy={element.cy}
          r={element.r}
        />
      );
    case 'rect':
      return (
        <Rect
          key={index}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          {...(element.rx !== undefined ? {rx: element.rx} : {})}
          {...(element.ry !== undefined ? {ry: element.ry} : {})}
        />
      );
  }
};

/**
 * The props every per-glyph component takes: the base renderer's props without
 * the glyph data it supplies itself.
 */
type GlyphComponentProps = {
  /** Square size in px. Defaults to Feather's native 24. */
  size?: number;
  /**
   * Stroke color (any CSS color). Defaults to "currentColor", so the icon
   * inherits the surrounding text color where the platform supports it; pass an
   * explicit color when it does not.
   */
  color?: string;
  /** Stroke width. Feather's native weight is 2. */
  strokeWidth?: number;
  /**
   * When set, the icon is exposed to assistive tech under this label; otherwise
   * it is decorative (aria-hidden).
   */
  accessibilityLabel?: string;
};

type GlyphIconProps = GlyphComponentProps & {
  /**
   * The glyph's SVG elements: the official Feather element data for one icon
   * (24x24 viewBox, stroke-based, no fill).
   */
  elements: IconElement[];
};

/**
 * The base renderer — the only component that knows about SVG structure. Each
 * glyph below is a small component embedding only its own glyph's element data
 * and rendering through this component.
 */
const GlyphIcon = ({
  elements,
  size = 24,
  color = 'currentColor',
  strokeWidth = 2,
  accessibilityLabel,
}: GlyphIconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...(accessibilityLabel
      ? {accessibilityLabel}
      : {'aria-hidden': true as const})}
  >
    {elements.map(renderElement)}
  </Svg>
);

/**
 * The official Feather home element data (feathericons/feather, MIT licensed) —
 * copied from the Feather SVG source, not redrawn.
 */
const homeElements: IconElement[] = [
  {kind: 'path', d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'},
  {kind: 'polyline', points: '9 22 9 12 15 12 15 22'},
];

/** The home glyph: home screens and start destinations. */
const HomeIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={homeElements}
    {...props}
  />
);

/**
 * The official Feather book-open element data (feathericons/feather, MIT
 * licensed) — copied from the Feather SVG source, not redrawn.
 */
const recipesElements: IconElement[] = [
  {kind: 'path', d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'},
  {kind: 'path', d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'},
];

/** The book-open glyph: recipes and other reading content. */
const RecipesIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={recipesElements}
    {...props}
  />
);

/**
 * The official Feather users element data (feathericons/feather, MIT licensed)
 * — copied from the Feather SVG source, not redrawn.
 */
const usersElements: IconElement[] = [
  {kind: 'path', d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'},
  {kind: 'circle', cx: '9', cy: '7', r: '4'},
  {kind: 'path', d: 'M23 21v-2a4 4 0 0 0-3-3.87'},
  {kind: 'path', d: 'M16 3.13a4 4 0 0 1 0 7.75'},
];

/** The users glyph: content shared with people. */
const SharedIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={usersElements}
    {...props}
  />
);

/**
 * The official Feather plus element data (feathericons/feather, MIT licensed) —
 * copied from the Feather SVG source, not redrawn.
 */
const addElements: IconElement[] = [
  {kind: 'line', x1: '12', y1: '5', x2: '12', y2: '19'},
  {kind: 'line', x1: '5', y1: '12', x2: '19', y2: '12'},
];

/** The plus glyph: add and create actions. */
const AddIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={addElements}
    {...props}
  />
);

/**
 * The official Feather tag element data (feathericons/feather, MIT licensed) —
 * copied from the Feather SVG source, not redrawn.
 */
const tagElements: IconElement[] = [
  {
    kind: 'path',
    d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z',
  },
  {kind: 'line', x1: '7', y1: '7', x2: '7.01', y2: '7'},
];

/** The tag glyph: tags and labels. */
const TagsIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={tagElements}
    {...props}
  />
);

/**
 * The official Feather user element data (feathericons/feather, MIT licensed) —
 * copied from the Feather SVG source, not redrawn.
 */
const profileElements: IconElement[] = [
  {kind: 'path', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'},
  {kind: 'circle', cx: '12', cy: '7', r: '4'},
];

/** The user glyph: profile and account. */
const ProfileIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={profileElements}
    {...props}
  />
);

/**
 * The divided-plate element data — the one glyph here that is NOT official
 * Feather data. Feather has no plate icon, so this glyph is an original design
 * drawn to Feather's construction specifications: the same 24x24 grid, 2px
 * stroke, round caps and joins, and no fill, so it sits invisibly alongside the
 * Feather glyphs. The shape: three outlined portions and no rim — two quarter
 * portions across the top and one half portion along the bottom, enlarged to
 * fill the frame. Every arc is concentric (same center, 12,12), so the
 * portions' curves all follow one curve.
 */
const mealsElements: IconElement[] = [
  {
    kind: 'path',
    d: 'M2.62 10.5 L10.5 10.5 L10.5 2.62 A9.5 9.5 0 0 0 2.62 10.5 Z',
  },
  {
    kind: 'path',
    d: 'M21.38 10.5 L13.5 10.5 L13.5 2.62 A9.5 9.5 0 0 1 21.38 10.5 Z',
  },
  {kind: 'path', d: 'M2.62 13.5 A9.5 9.5 0 0 0 21.38 13.5 Z'},
];

/** The divided-plate glyph: meals and meal planning. */
const MealsIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={mealsElements}
    {...props}
  />
);

/**
 * The official Feather alert-triangle element data (feathericons/feather, MIT
 * licensed) — copied from the Feather SVG source, not redrawn.
 */
const warningElements: IconElement[] = [
  {
    kind: 'path',
    d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  },
  {kind: 'line', x1: '12', y1: '9', x2: '12', y2: '13'},
  {kind: 'line', x1: '12', y1: '17', x2: '12.01', y2: '17'},
];

/** The alert-triangle glyph: warnings and cautions. */
const WarningIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={warningElements}
    {...props}
  />
);

/**
 * The official Feather message-circle element data (feathericons/feather, MIT
 * licensed) — copied from the Feather SVG source, not redrawn.
 */
const feedbackElements: IconElement[] = [
  {
    kind: 'path',
    d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
  },
];

/** The message-circle glyph: feedback and comments. */
const FeedbackIcon: ComponentType<GlyphComponentProps> = props => (
  <GlyphIcon
    elements={feedbackElements}
    {...props}
  />
);

const iconNames = [
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

export type IconName = (typeof iconNames)[number];

const icons: Record<IconName, ComponentType<GlyphComponentProps>> = {
  'home': HomeIcon,
  'book-open': RecipesIcon,
  'users': SharedIcon,
  'plus': AddIcon,
  'tag': TagsIcon,
  'user': ProfileIcon,
  'coffee': MealsIcon,
  'alert-triangle': WarningIcon,
  'message-circle': FeedbackIcon,
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  // The legacy `className` prop remains in the prop type for API
  // compatibility but is no longer applied — no caller passes it, and
  // styling now comes from the design system (the BookLoadingSpinner
  // precedent). These icons are sized/colored via the size/color props.
  className?: string;
  accessibilityLabel?: string;
};

export const Icon = ({
  name,
  size = 20,
  color,
  accessibilityLabel,
}: IconProps) => {
  const Component = icons[name];

  return (
    <Component
      size={size}
      color={color}
      accessibilityLabel={accessibilityLabel}
    />
  );
};
