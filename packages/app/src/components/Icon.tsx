import type {FeatherIconName} from '@eciperay/icons';
import React from 'react';
import Feather from 'react-native-vector-icons/Feather';

type IconProps = {
  name: FeatherIconName;
  size?: number;
  color?: string;
  className?: string;
  accessibilityLabel?: string;
};

export const Icon = ({
  name,
  size = 20,
  color,
  className,
  accessibilityLabel,
}: IconProps) => (
  <Feather
    name={name}
    size={size}
    color={color}
    className={className}
    accessibilityLabel={accessibilityLabel}
  />
);
