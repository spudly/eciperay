import {Icon} from '../Icon.js';

type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <Icon
    name="alert-triangle"
    size={16}
    className="text-amber-600"
    aria-label={label}
    title={label}
  />
);

if (import.meta.env.DEV) {
  StaleVersionHint.demo = function StaleVersionHintDemo() {
    return <StaleVersionHint label="Based on an older version" />;
  };
}
