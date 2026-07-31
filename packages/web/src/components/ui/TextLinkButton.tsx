import type {TextLinkButtonProps} from '@eciperay/client';
import clsx from 'clsx';
import {Link} from 'react-router-dom';

type WebTextLinkButtonProps = TextLinkButtonProps & {to?: string};

export const TextLinkButton = ({
  label,
  onPress,
  variant = 'primary',
  to,
}: WebTextLinkButtonProps) => {
  const className = clsx(
    'block text-center',
    variant === 'primary'
      ? 'text-primary mbs-4 text-base'
      : 'text-muted mbs-2 text-sm',
  );

  if (to) {
    return (
      <Link
        to={to}
        className={className}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onPress?.();
      }}
    >
      {label}
    </button>
  );
};

if (import.meta.env.DEV) {
  TextLinkButton.demo = function TextLinkButtonDemo() {
    return (
      <TextLinkButton
        label="Text link"
        onPress={() => {
          void 0;
        }}
      />
    );
  };
}
