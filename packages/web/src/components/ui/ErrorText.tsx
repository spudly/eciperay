import type {ErrorTextProps} from '@eciperay/client';

export const ErrorText = ({children}: ErrorTextProps) => (
  <p className="ui-error-text">{children}</p>
);

if (import.meta.env.DEV) {
  ErrorText.demo = function ErrorTextDemo() {
    return <ErrorText>Something went wrong.</ErrorText>;
  };
}
