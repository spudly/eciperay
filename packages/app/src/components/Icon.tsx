import type {FeatherIconName} from '@eciperay/icons';
import React from 'react';
import Feather from 'react-native-vector-icons/Feather';

type IconProps = {
  name: FeatherIconName;
  size?: number;
  color?: string;
  // The legacy `className` prop remains in the prop type for API
  // compatibility but is no longer applied — no caller passes it, and
  // styling now comes from the design system (the BookLoadingSpinner
  // precedent). Feather icons are sized/colored via the size/color props.
  className?: string;
  accessibilityLabel?: string;
};

export const Icon = ({
  name,
  size = 20,
  color,
  accessibilityLabel,
}: IconProps) => (
  <Feather
    name={name}
    size={size}
    color={color}
    accessibilityLabel={accessibilityLabel}
  />
);

if (__DEV__) {
  Icon.demo = () => (
    <Icon
      name="coffee"
      size={28}
      accessibilityLabel="Meals"
    />
  );
}
