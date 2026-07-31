import type {ScreenContainerProps} from '@eciperay/client';
import {View} from 'react-native';

import {PageTitle} from './PageTitle';

const variantClass = (variant: ScreenContainerProps['variant']) => {
  if (variant === 'list') {
    return 'flex-1 bg-gray-50';
  }
  if (variant === 'padded') {
    return 'ui-screen-shell-padded';
  }
  if (variant === 'white') {
    return 'flex-1 bg-white';
  }
  return 'ui-screen-shell';
};

export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => (
  <View className={variantClass(variant)}>{children}</View>
);

if (__DEV__) {
  ScreenContainer.demo = () => (
    <ScreenContainer variant="padded">
      <PageTitle spacing="section">Screen container</PageTitle>
    </ScreenContainer>
  );
}
