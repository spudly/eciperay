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
 * Feather icons rendered via react-icons, but which glyph a given app concept
 * uses is app configuration, so the name set and the name-to-component mapping
 * live here (moved out of the retired `@eciperay/icons` package in #246).
 *
 * The shell's glyphs are NOT rendered through this component any more: #451
 * adopted the design system's AppShellPage, whose nav takes DS icon registry
 * names as data. What remains here serves the two non-shell surfaces no DS page
 * owns yet — FeedbackBubble (`message-circle`) and StaleVersionHint
 * (`alert-triangle`). Per Stephen's 2026-11-07 ruling on #451, the DS will own
 * those surfaces through exported pages; when such pages land, these usages
 * migrate and this component retires.
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
