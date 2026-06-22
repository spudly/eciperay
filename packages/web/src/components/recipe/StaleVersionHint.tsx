type Props = {label: string};

export const StaleVersionHint = ({label}: Props) => (
  <span
    title={label}
    aria-label={label}
    className="text-sm text-amber-600"
  >
    ⚠
  </span>
);
