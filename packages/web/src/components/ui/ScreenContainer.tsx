import type {ScreenContainerProps} from '@eciperay/client';
import {ScreenContainer as DSScreenContainer, tokens} from '@spudly/ui';

import {PageTitle} from './PageTitle.js';

export const ScreenContainer = ({
  children,
  variant = 'default',
}: ScreenContainerProps) => (
  // On web the body already scrolls; the Tamagui ScrollView wrapper is redundant.
  <DSScreenContainer
    scrollable={false}
    backgroundColor={
      variant === 'list'
        ? tokens.colors.gray.gray2
        : variant === 'white'
          ? '#ffffff'
          : undefined
    }
  >
    {children}
  </DSScreenContainer>
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
