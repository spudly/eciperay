import {tokens} from '@spudly/ui';

import {Icon} from '../Icon.js';

type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <span
    style={{color: tokens.colors.warning.warning7, display: 'inline-flex'}}
  >
    <Icon
      name="alert-triangle"
      size={16}
      aria-label={label}
      title={label}
    />
  </span>
);

if (import.meta.env.DEV) {
  StaleVersionHint.demo = function StaleVersionHintDemo() {
    return <StaleVersionHint label="Based on an older version" />;
  };
}
