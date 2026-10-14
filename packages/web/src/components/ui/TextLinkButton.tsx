import type {TextLinkButtonProps} from '@eciperay/client';
import {Button as DSButton, Text as DSText, tokens} from '@spudly/ui';
import {Link} from 'react-router-dom';

type WebTextLinkButtonProps = TextLinkButtonProps & {to?: string};

export const TextLinkButton = ({
  label,
  onPress,
  variant = 'primary',
  to,
}: WebTextLinkButtonProps) => {
  if (to) {
    return (
      <Link
        to={to}
        style={{display: 'block', textAlign: 'center', textDecoration: 'none'}}
      >
        <DSText
          style={{
            color:
              variant === 'primary'
                ? tokens.colors.primary.primary7
                : tokens.colors.gray.gray7,
          }}
        >
          {label}
        </DSText>
      </Link>
    );
  }

  return (
    <DSButton
      variant="ghost"
      onPress={onPress}
      color={
        variant === 'primary' ? undefined : tokens.colors.gray.gray7
      }
    >
      {label}
    </DSButton>
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
