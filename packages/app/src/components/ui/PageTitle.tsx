import type {PageTitleProps} from '@eciperay/client';
import {Text as DSText, tokens} from '@spudly/ui';

type SizeStyle = {
  variant: 'heading' | 'subheading';
  fontSize?: number;
  fontWeight?: typeof tokens.typography.fontWeight.bold;
};

const sizeStyle = (size: PageTitleProps['size']): SizeStyle => {
  if (size === 'auth') {
    // Old ui-page-title-lg: text-3xl font-bold
    return {variant: 'heading'};
  }
  if (size === 'section') {
    // Old ui-section-title: text-xl font-bold
    return {
      variant: 'subheading',
      fontSize: tokens.typography.fontSize.xl,
      fontWeight: tokens.typography.fontWeight.bold,
    };
  }
  // Old ui-page-title: text-2xl font-bold
  return {
    variant: 'heading',
    fontSize: tokens.typography.fontSize['2xl'],
  };
};

const spacingValue = (spacing: PageTitleProps['spacing']) => {
  if (spacing === 'auth') {
    return tokens.spacing[8];
  }
  if (spacing === 'section') {
    return tokens.spacing[4];
  }
  return tokens.spacing[6];
};

/**
 * Thin adapter over the DS Text primitive. Keeps the eciperay
 * size/spacing prop API while rendering token-driven type.
 */
export const PageTitle = ({
  children,
  size = 'page',
  spacing = 'default',
}: PageTitleProps) => {
  const {variant, fontSize, fontWeight} = sizeStyle(size);
  return (
    <DSText
      variant={variant}
      fontSize={fontSize}
      fontWeight={fontWeight}
      marginBottom={spacingValue(spacing)}
    >
      {children}
    </DSText>
  );
};

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
