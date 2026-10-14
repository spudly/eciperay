import type {ErrorTextProps} from '@eciperay/client';
import {Text as DSText} from '@spudly/ui';

export const ErrorText = ({children}: ErrorTextProps) => (
  <DSText variant="error">{children}</DSText>
);

if (import.meta.env.DEV) {
  ErrorText.demo = function ErrorTextDemo() {
    return <ErrorText>Something went wrong.</ErrorText>;
  };
}
