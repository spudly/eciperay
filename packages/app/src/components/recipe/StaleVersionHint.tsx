import {tokens} from '@spudly/ui';
import React from 'react';

import {Icon} from '../Icon';

type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <Icon
    name="alert-triangle"
    size={16}
    color={tokens.colors.warning.warning7}
    accessibilityLabel={label}
  />
);

if (__DEV__) {
  StaleVersionHint.demo = () => (
    <StaleVersionHint label="Based on an older version" />
  );
}
