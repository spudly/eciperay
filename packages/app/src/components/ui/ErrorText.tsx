import type {ErrorTextProps} from '@eciperay/client';
import {Text} from 'react-native';

export const ErrorText = ({children}: ErrorTextProps) => (
  <Text className="ui-error-text">{children}</Text>
);

if (__DEV__) {
  ErrorText.demo = () => <ErrorText>Something went wrong.</ErrorText>;
}
