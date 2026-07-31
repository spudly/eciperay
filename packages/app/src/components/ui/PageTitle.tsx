import type {PageTitleProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text} from 'react-native';

const titleClass = (size: PageTitleProps['size']) => {
  if (size === 'auth') {
    return 'ui-page-title-lg';
  }
  if (size === 'section') {
    return 'ui-section-title';
  }
  return 'ui-page-title';
};

const spacingClass = (spacing: PageTitleProps['spacing']) => {
  if (spacing === 'auth') {
    return 'mb-8';
  }
  if (spacing === 'section') {
    return 'mb-4';
  }
  return 'mb-6';
};

export const PageTitle = ({
  children,
  size = 'page',
  spacing = 'default',
}: PageTitleProps) => (
  <Text className={clsx(titleClass(size), spacingClass(spacing))}>
    {children}
  </Text>
);

if (__DEV__) {
  PageTitle.demo = () => (
    <PageTitle
      size="auth"
      spacing="section"
    >
      Page title
    </PageTitle>
  );
}
