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

type IconName = (typeof iconNames)[number];

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
  'name': IconName;
  'size'?: number;
  'className'?: string;
  'aria-label'?: string;
  'title'?: string;
};

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const Icon = ({
  name,
  size = 20,
  className,
  'aria-label': ariaLabel,
  title,
}: IconProps) => {
  const Component = icons[name];
  const glyph = (
    <Component
      size={size}
      accessibilityLabel={ariaLabel}
    />
  );

  // The design-system icons accept no className or title: they stroke
  // `currentColor` and expose only an accessibility label. When a caller
  // passes className/title, wrap the glyph so the class still colors it
  // (the stroke inherits the wrapper's text color) and the title still
  // shows as a tooltip.
  if (!className && !title) {
    return glyph;
  }

  return (
    <span
      className={className}
      style={{display: 'inline-flex'}}
      title={title}
    >
      {glyph}
    </span>
  );
};

if (import.meta.env.DEV) {
  Icon.demo = function IconDemo() {
    return (
      <Icon
        name="book-open"
        size={28}
        aria-label="Recipes"
      />
    );
  };
}
