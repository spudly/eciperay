import type {PageTitleProps} from '@eciperay/client';
import clsx from 'clsx';

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
    return 'mbe-8';
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
}: PageTitleProps) => {
  const Tag = size === 'section' ? 'h2' : 'h1';

  return (
    <Tag className={clsx(titleClass(size), spacingClass(spacing))}>
      {children}
    </Tag>
  );
};

if (import.meta.env.DEV) {
  PageTitle.demo = function PageTitleDemo() {
    return (
      <PageTitle
        size="auth"
        spacing="section"
      >
        Page title
      </PageTitle>
    );
  };
}
