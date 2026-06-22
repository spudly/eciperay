import React from 'react';
import {Text} from 'react-native';

type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <Text
    accessibilityLabel={label}
    className="text-sm text-amber-600"
  >
    ⚠
  </Text>
);
