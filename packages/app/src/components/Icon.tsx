import type {IconComponentProps} from '@spudly/ui/icons';
import type {ComponentType} from 'react';
import {
  AddIcon,
  FeedbackIcon,
  HomeIcon,
  MealsIcon,
  ProfileIcon,
  RecipesIcon,
  SharedIcon,
  TagsIcon,
  WarningIcon,
} from '@spudly/ui/icons';
import React from 'react';

/**
 * The icon names this app renders, owned by the app: the design system ships
 * the glyphs as semantic components (`@spudly/ui/icons`), but which glyph a
 * given app concept uses is app configuration, so the name set and the
 * name-to-component mapping live here (moved out of the retired
 * `@eciperay/icons` package in #246).
 */
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

const icons: Record<IconName, ComponentType<IconComponentProps>> = {
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
  // precedent). Design-system icons are sized/colored via the
  // size/color props.
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
