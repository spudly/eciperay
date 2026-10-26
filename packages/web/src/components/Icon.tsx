import type {FeatherIconName} from '@eciperay/icons';
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

const featherIcons: Record<FeatherIconName, IconType> = {
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
  'name': FeatherIconName;
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
  const Component = featherIcons[name];

  return (
    <Component
      size={size}
      className={className}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      title={title}
    />
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
