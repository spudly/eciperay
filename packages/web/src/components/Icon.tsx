import type {IconType} from 'react-icons';
import {
  FiAlertTriangle,
  FiBookOpen,
  FiCoffee,
  FiHome,
  FiMessageCircle,
  FiPlus,
  FiTag,
  FiUser,
  FiUsers,
} from 'react-icons/fi';

/**
 * The icon names this app renders, owned by the app: the glyphs are host-side
 * Feather icons rendered via react-icons — a temporary measure pending the
 * design-system shell work (follow-up issue #451) — but which glyph a given app
 * concept uses is app configuration, so the name set and the name-to-component
 * mapping live here (moved out of the retired `@eciperay/icons` package in
 * #246).
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

const icons: Record<IconName, IconType> = {
  'home': FiHome,
  'book-open': FiBookOpen,
  'users': FiUsers,
  'plus': FiPlus,
  'tag': FiTag,
  'user': FiUser,
  'coffee': FiCoffee,
  'alert-triangle': FiAlertTriangle,
  'message-circle': FiMessageCircle,
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
      {...(ariaLabel
        ? {'aria-label': ariaLabel}
        : {'aria-hidden': true as const})}
    />
  );

  // The Feather glyphs stroke `currentColor`. When a caller passes
  // className/title, wrap the glyph so the class still colors it
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
