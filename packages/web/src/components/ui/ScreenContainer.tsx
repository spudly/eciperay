import type {ScreenContainerProps} from '@eciperay/client';

import {PageTitle} from './PageTitle.js';

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
  <div className={variantClass(variant)}>{children}</div>
);

if (import.meta.env.DEV) {
  ScreenContainer.demo = function ScreenContainerDemo() {
    return (
      <ScreenContainer variant="padded">
        <PageTitle spacing="section">Screen container</PageTitle>
      </ScreenContainer>
    );
  };
}
