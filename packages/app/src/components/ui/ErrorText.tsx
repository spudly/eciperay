import type {ErrorTextProps} from '@eciperay/client';
import {Text as DsText} from '@spudly/ui';

export const ErrorText = ({children}: ErrorTextProps) => (
  <DsText variant="error">{children}</DsText>
);

if (__DEV__) {
  ErrorText.demo = () => <ErrorText>Something went wrong.</ErrorText>;
}
