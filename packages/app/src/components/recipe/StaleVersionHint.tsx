import React from 'react';

import {Icon} from '../Icon';

type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <Icon
    name="alert-triangle"
    size={16}
    className="text-amber-600"
    accessibilityLabel={label}
  />
);
